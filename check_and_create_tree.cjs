const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTreesAndCreateIfNeeded() {
  try {
    console.log('🌳 Vérification des arbres TreeBranchLeaf...\n');
    
    // Vérifier les arbres existants avec requête SQL directe
    const existingTrees = await prisma.$queryRaw`
      SELECT * FROM "TreeBranchLeafTree" ORDER BY id ASC
    `;
    
    console.log(`📊 Arbres existants: ${existingTrees.length}`);
    
    if (existingTrees.length > 0) {
      existingTrees.forEach((tree, index) => {
        console.log(`  ${index + 1}. ID: ${tree.id} | Nom: ${tree.name} | Organisation: ${tree.organizationId}`);
      });
    } else {
      console.log('❌ Aucun arbre trouvé !');
      console.log('\n🆕 Création d\'un arbre de test...');
      
      // Créer un arbre de test avec requête SQL directe
      const now = new Date();
      const treeId = 1;
      const orgId = '1757366075154-i554z93kl'; // Organisation du super admin
      
      await prisma.$executeRaw`
        INSERT INTO "TreeBranchLeafTree" (
          id, name, description, "organizationId", "createdAt", "updatedAt"
        ) VALUES (
          ${treeId},
          ${'Arbre Test Devis'},
          ${'Arbre de test pour la création de devis avec triggers automatiques'},
          ${orgId},
          ${now},
          ${now}
        )
      `;
      
      console.log(`✅ Arbre créé avec ID: ${treeId}`);
      
      // Vérifier que l'arbre a bien été créé
      const createdTree = await prisma.$queryRaw`
        SELECT * FROM "TreeBranchLeafTree" WHERE id = ${treeId}
      `;
      
      if (createdTree.length > 0) {
        console.log('🎉 Arbre créé avec succès !');
        console.log('  - ID:', createdTree[0].id);
        console.log('  - Nom:', createdTree[0].name);
        console.log('  - Organisation:', createdTree[0].organizationId);
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTreesAndCreateIfNeeded();
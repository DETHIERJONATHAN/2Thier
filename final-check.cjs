const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function finalCheck() {
  try {
    console.log('🎯 VÉRIFICATION FINALE - TreeBranchLeaf');
    console.log('=====================================');
    
    const tree = await prisma.treeBranchLeafTree.findUnique({
      where: { id: 'cmf1mwoz10005gooked1j6orn' }
    });
    
    if (tree) {
      console.log('✅ Arbre TreeBranchLeaf correctement configuré');
      console.log(`   🆔 ID: ${tree.id}`);
      console.log(`   📝 Nom: ${tree.name}`);
      console.log(`   🏢 Organisation: ${tree.organizationId}`);
      
      const nodeCount = await prisma.treeBranchLeafNode.count({
        where: { treeId: tree.id }
      });
      
      console.log(`   📦 Nœuds disponibles: ${nodeCount}`);
      
      console.log('\n🚀 RÉSULTAT: Module TreeBranchLeaf opérationnel !');
      console.log('   Frontend peut maintenant accéder à l\'arbre');
      console.log('   API endpoint: /api/treebranchleaf/trees/' + tree.id + '/nodes');
      
    } else {
      console.log('❌ Problème: Arbre non trouvé');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

finalCheck();

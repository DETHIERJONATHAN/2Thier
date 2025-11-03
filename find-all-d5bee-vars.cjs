const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 Recherche de TOUTES les variables qui commencent par d5bee61e-ca33-4cc8-88a5-6954683e6c84\n');
    
    // Chercher toutes les versions (avec et sans suffixe)
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        id: { startsWith: 'd5bee61e-ca33-4cc8-88a5-6954683e6c84' }
      },
      select: {
        id: true,
        displayName: true,
        nodeId: true,
        sourceRef: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`✅ Trouvé ${variables.length} variable(s):\n`);
    
    for (const v of variables) {
      console.log(`📌 ID: ${v.id}`);
      console.log(`   displayName: ${v.displayName}`);
      console.log(`   nodeId: ${v.nodeId}`);
      console.log(`   sourceRef: ${v.sourceRef}`);
      console.log(`   createdAt: ${v.createdAt}`);
      
      // Vérifier si le nœud existe
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: v.nodeId },
        select: { id: true, label: true, parentId: true }
      });
      
      if (node) {
        console.log(`   ✅ Nœud existe: ${node.label} (parentId: ${node.parentId})`);
      } else {
        console.log(`   ❌ Nœud N'EXISTE PAS !`);
      }
      console.log('');
    }
    
    // Maintenant chercher f1dc1a71 aussi
    console.log('\n🔍 Recherche de f1dc1a71-4006-4aae-8e70-4b3839d658b8\n');
    
    const vars2 = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        id: { startsWith: 'f1dc1a71-4006-4aae-8e70-4b3839d658b8' }
      },
      select: {
        id: true,
        displayName: true,
        nodeId: true,
        createdAt: true
      }
    });
    
    console.log(`✅ Trouvé ${vars2.length} variable(s):\n`);
    for (const v of vars2) {
      console.log(`📌 ${v.id} - ${v.displayName} (nodeId: ${v.nodeId})`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

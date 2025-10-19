const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const nodeId = '131a7b51-97d5-4f40-8a5a-9359f38939e8';
    const tableId = 'a7918ce9-fcf9-41ce-8783-5ba09980695d';
    
    console.log(`🔍 Recherche du nœud: ${nodeId}`);
    
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: {
        id: true,
        label: true,
        type: true,
      }
    });
    
    console.log('\n📝 Nœud trouvé:');
    console.log(JSON.stringify(node, null, 2));
    
    console.log(`\n🔍 Recherche de TOUS les tableaux dans TreeBranchLeafNodeTable contenant "${tableId}"...`);
    
    const allTables = await prisma.treeBranchLeafNodeTable.findMany({
      select: {
        id: true,
        nodeId: true,
        name: true,
        type: true,
      },
      take: 10
    });
    
    console.log(`\n📊 ${allTables.length} premiers tableaux dans la base:`);
    allTables.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.id} - ${t.name} (type: ${t.type})`);
    });
    
    console.log(`\n🎯 Recherche du tableau spécifique: ${tableId}`);
    const specificTable = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: tableId }
    });
    
    if (specificTable) {
      console.log('\n✅ Tableau trouvé dans TreeBranchLeafNodeTable:');
      console.log(JSON.stringify(specificTable, null, 2));
    } else {
      console.log('\n❌ Tableau INTROUVABLE dans TreeBranchLeafNodeTable');
      
      // Chercher dans l'ancienne table
      console.log('\n🔍 Recherche dans l\'ancienne table TreeBranchLeafTable...');
      const oldTable = await prisma.treeBranchLeafTable.findUnique({
        where: { id: tableId }
      });
      
      if (oldTable) {
        console.log('\n⚠️ Tableau trouvé dans ANCIENNE table TreeBranchLeafTable:');
        console.log(JSON.stringify(oldTable, null, 2));
      } else {
        console.log('\n❌ Tableau introuvable dans l\'ancienne table aussi');
      }
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

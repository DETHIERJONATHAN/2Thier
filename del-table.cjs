const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  try {
    // Supprimer d'abord les tableColumns et tableRows liés
    await p.treeBranchLeafNodeTableColumn.deleteMany({
      where: { tableId: 'b7a54551-38ec-403e-a62d-8e6e8985e1ed-1' }
    });
    await p.treeBranchLeafNodeTableRow.deleteMany({
      where: { tableId: 'b7a54551-38ec-403e-a62d-8e6e8985e1ed-1' }
    });
    
    // Puis supprimer la table
    await p.treeBranchLeafNodeTable.delete({
      where: { id: 'b7a54551-38ec-403e-a62d-8e6e8985e1ed-1' }
    });
    
    console.log('✅ Table b7a54551-38ec-403e-a62d-8e6e8985e1ed-1 supprimée');
  } catch (e) {
    console.log('❌ Erreur suppression:', e.message);
  }
  await p.$disconnect();
})();

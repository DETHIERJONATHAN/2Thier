const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const varIds = [
      'd5bee61e-ca33-4cc8-88a5-6954683e6c84-1',
      'f1dc1a71-4006-4aae-8e70-4b3839d658b8-1'
    ];
    
    console.log('🔍 Recherche des IDs dans linkedVariableIds des nœuds...\n');
    
    for (const varId of varIds) {
      console.log(`\n📌 ID recherché: ${varId}`);
      
      // Chercher dans quel nœud cet ID apparaît dans linkedVariableIds
      const nodes = await prisma.$queryRaw`
        SELECT id, label, "linkedVariableIds"
        FROM "TreeBranchLeafNode"
        WHERE "linkedVariableIds" @> ARRAY[${varId}]::text[]
      `;
      
      if (nodes.length > 0) {
        console.log(`  ✅ Trouvé dans ${nodes.length} nœud(s):`);
        for (const node of nodes) {
          console.log(`    - ${node.label} (${node.id})`);
          console.log(`      linkedVariableIds: ${JSON.stringify(node.linkedVariableIds)}`);
        }
      } else {
        console.log(`  ❌ Pas trouvé dans linkedVariableIds`);
      }
      
      // Vérifier si la variable existe réellement dans la table
      const varExists = await prisma.treeBranchLeafNodeVariable.findUnique({
        where: { id: varId }
      });
      
      if (varExists) {
        console.log(`  ✅ Variable EXISTE dans TreeBranchLeafNodeVariable`);
        console.log(`     - displayName: ${varExists.displayName}`);
        console.log(`     - nodeId: ${varExists.nodeId}`);
        console.log(`     - sourceRef: ${varExists.sourceRef}`);
      } else {
        console.log(`  ❌ Variable N'EXISTE PAS dans TreeBranchLeafNodeVariable`);
        console.log(`  ⚠️  PROBLÈME: L'ID est dans linkedVariableIds mais la variable n'existe pas !`);
      }
    }
    
    // Vérifier aussi l'original pour comparaison
    console.log('\n\n📋 ORIGINAL pour comparaison:');
    const originalId = 'd5bee61e-ca33-4cc8-88a5-6954683e6c84';
    const originalVar = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: originalId },
      select: { id: true, displayName: true, nodeId: true, sourceRef: true }
    });
    
    if (originalVar) {
      console.log(`✅ ${originalVar.displayName}`);
      console.log(`   nodeId: ${originalVar.nodeId}`);
      console.log(`   sourceRef: ${originalVar.sourceRef}`);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
})();

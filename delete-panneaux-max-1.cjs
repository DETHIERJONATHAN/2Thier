const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const nodeId = '3da47bc3-739e-4c83-98c3-813ecf77a740-1';
  
  console.log(`🗑️ Suppression de Panneaux max-1 (${nodeId})...`);
  
  // Supprimer les tables liées (si elles existent)
  const tables = await prisma.treeBranchLeafNodeTable.deleteMany({
    where: { nodeId }
  });
  console.log(`   Tables supprimées: ${tables.count}`);
  
  // Supprimer les formules liées
  const formulas = await prisma.treeBranchLeafNodeFormula.deleteMany({
    where: { nodeId }
  });
  console.log(`   Formules supprimées: ${formulas.count}`);
  
  // Supprimer les conditions liées
  const conditions = await prisma.treeBranchLeafNodeCondition.deleteMany({
    where: { nodeId }
  });
  console.log(`   Conditions supprimées: ${conditions.count}`);
  
  // Supprimer les variables liées
  const variables = await prisma.treeBranchLeafNodeVariable.deleteMany({
    where: { nodeId }
  });
  console.log(`   Variables supprimées: ${variables.count}`);
  
  // Supprimer le nœud
  const node = await prisma.treeBranchLeafNode.delete({
    where: { id: nodeId }
  }).catch(() => null);
  
  if (node) {
    console.log(`✅ Nœud supprimé: ${node.label}`);
  } else {
    console.log(`⚠️ Nœud déjà supprimé ou introuvable`);
  }
  
  // Aussi supprimer les tables orphelines -1
  const orphanTables = await prisma.treeBranchLeafNodeTable.deleteMany({
    where: {
      id: { endsWith: '-1' },
      nodeId: { startsWith: '3da47bc3-739e-4c83-98c3-813ecf77a740' }
    }
  });
  console.log(`   Tables orphelines supprimées: ${orphanTables.count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

/**
 * Script pour vérifier où pointe le tableReference des SELECT configs
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Vérification des tableReference...\n');

  const selectConfigs = await prisma.treeBranchLeafSelectConfig.findMany({
    take: 10
  });

  for (const cfg of selectConfigs) {
    console.log(`\n📊 SELECT CONFIG pour nodeId: ${cfg.nodeId}`);
    console.log(`   tableReference: ${cfg.tableReference || 'null'}`);

    if (cfg.tableReference) {
      // Vérifier si c'est une TreeBranchLeafNodeTable
      const nodeTable = await prisma.treeBranchLeafNodeTable.findUnique({
        where: { id: cfg.tableReference }
      });

      if (nodeTable) {
        console.log(`   → C'est une TreeBranchLeafNodeTable: "${nodeTable.name}"`);
        console.log(`     nodeId de la table: ${nodeTable.nodeId}`);
      } else {
        console.log(`   → Ce n'est PAS une TreeBranchLeafNodeTable`);
        console.log(`   → C'est probablement une table externe (TBLMatrix ou autre)`);
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

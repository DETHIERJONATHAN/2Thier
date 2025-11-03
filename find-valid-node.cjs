const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Trouver la première table
  const table = await prisma.treeBranchLeafNodeTable.findFirst();
  if (table) {
    console.log('✅ Found existing table:');
    console.log(`   ID: ${table.id}`);
    console.log(`   nodeId: ${table.nodeId}`);
    console.log(`   organizationId: ${table.organizationId}`);
  }

  // Trouver le nœud associé
  if (table) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: table.nodeId }
    });
    console.log(`\n✅ Found associated node:`);
    console.log(`   ID: ${node?.id || 'NOT FOUND'}`);
  }

  await prisma.$disconnect();
}

main();

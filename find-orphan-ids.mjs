import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

console.log('\n==================== CHERCHER LES IDS linkedVariableIds ====================\n');

// Les IDs orphelins du diagnostic
const orphanIds = [
  'dd46f6b9-cdc0-4ab5-b304-79339f7f54fd',
  '3dac60e4-1915-479f-b6d6-31a2a9a2fd32'
];

for (const id of orphanIds) {
  console.log(`\n🔍 Cherchant ID: ${id}`);
  
  // Dans TreeBranchLeafNodeVariable?
  const inVar = await p.treeBranchLeafNodeVariable.findUnique({
    where: { nodeId: id },
    select: { nodeId: true, displayName: true }
  });
  if (inVar) {
    console.log(`   ✅ TreeBranchLeafNodeVariable: ${inVar.displayName}`);
  } else {
    console.log(`   ❌ TreeBranchLeafNodeVariable: NOT FOUND`);
  }

  // Dans TreeBranchLeafNode?
  const inNode = await p.treeBranchLeafNode.findUnique({
    where: { id },
    select: { id: true, label: true, type: true }
  });
  if (inNode) {
    console.log(`   ✅ TreeBranchLeafNode: "${inNode.label}" (type: ${inNode.type})`);
  } else {
    console.log(`   ❌ TreeBranchLeafNode: NOT FOUND`);
  }
}

console.log('\n✅ Fini!\n');

await p.$disconnect();

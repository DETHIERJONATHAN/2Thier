import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

console.log('\n🔍 DIAGNOSTIC: LinkedVariableIds APRÈS suppression\n');
console.log('='.repeat(80));

// Les 3 template display nodes
const displayNodeIds = [
  'f81b2ace-9f6c-45d4-82a7-a8e4bf842e45', // Orientation
  '7d3dc335-ab7e-43e2-bbf1-395981a7938a', // Inclinaison
  '6817ee20-5782-4b03-a7b1-0687cc5b4d58'  // Rampant toiture
];

console.log('📋 Vérification linkedVariableIds pour les 3 templates:\n');

for (const nodeId of displayNodeIds) {
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { label: true, linkedVariableIds: true }
  });
  
  if (node) {
    const hasLinks = node.linkedVariableIds && node.linkedVariableIds.length > 0;
    console.log(`${hasLinks ? '✅' : '❌'} ${node.label}`);
    console.log(`   linkedVariableIds: ${JSON.stringify(node.linkedVariableIds)}`);
  }
}

console.log('\n' + '='.repeat(80));

await prisma.$disconnect();

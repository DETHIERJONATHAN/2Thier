import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findRealNodes() {
  console.log('\n🔍 CHERCHER LES VRAIS IDs\n');

  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { id: 'b7a54551-38ec-403e-a62d-8e6e8985e1ed' },
        { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58' },
        { id: 'aaf69b1e-75d2-4a55-8bf2-231ca96e459a' }
      ]
    },
    select: { 
      id: true, 
      label: true, 
      linkedVariableIds: true, 
      parentId: true,
      type: true
    }
  });

  console.log(`Trouvé ${nodes.length} nœud(s):\n`);
  
  for (const node of nodes) {
    console.log(`📌 ${node.label} (${node.type})`);
    console.log(`   ID: ${node.id}`);
    console.log(`   Parent: ${node.parentId}`);
    console.log(`   linkedVariableIds: ${JSON.stringify(node.linkedVariableIds)}`);
    console.log('');
  }

  await prisma.$disconnect();
}

findRealNodes().catch(e => console.error(e));

import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

// Chercher les leaf_field avec linkedVariableIds
const displayNodes = await p.treeBranchLeafNode.findMany({
  where: {
    type: 'leaf_field',
    linkedVariableIds: {
      hasSome: []  // Avoir au moins une linkedVariableId
    }
  },
  select: {
    id: true,
    label: true,
    parentId: true,
    linkedVariableIds: true,
    metadata: true,
  },
  take: 50
});

console.log(`\n✅ Trouvé ${displayNodes.length} leaf_field avec linkedVariableIds\n`);

displayNodes.slice(0, 10).forEach((d, i) => {
  console.log(`[${i+1}] "${d.label}"`);
  console.log(`    linkedVariableIds: ${d.linkedVariableIds.length} items`);
  console.log(`    metadata: ${JSON.stringify(d.metadata).substring(0, 100)}`);
});

console.log('\n');
await p.$disconnect();

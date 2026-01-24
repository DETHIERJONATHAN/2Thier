import { db } from '../src/lib/database.js';

console.log('🔍 Recherche des champs Total et Puissance...\n');

const nodes = await db.treeBranchLeafNode.findMany({
  where: {
    OR: [
      { label: { contains: 'Total', mode: 'insensitive' } },
      { label: { contains: 'Puissance', mode: 'insensitive' } }
    ]
  },
  select: {
    id: true,
    label: true,
    metadata: true
  },
  take: 30
});

console.log(`Trouvé ${nodes.length} champs:\n`);

nodes.forEach(node => {
  const icon = node.metadata?.icon || '(aucun)';
  console.log(`- ${node.label}`);
  console.log(`  ID: ${node.id}`);
  console.log(`  Icône actuelle: ${icon}\n`);
});

await db.$disconnect();

import { db } from '../src/lib/database.js';

console.log('⚡ Mise à jour des icônes pour tous les champs Puissance WC...\n');

const puissanceNodeIds = [
  'c8139b2c-b0a8-44e7-8448-137fd2fb8e23',      // Puissance WC (original)
  'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-1',    // Puissance WC-1
  'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-sum-total' // Puissance WC - Total
];

for (const nodeId of puissanceNodeIds) {
  const node = await db.treeBranchLeafNode.findUnique({
    where: { id: nodeId },
    select: { label: true, metadata: true }
  });

  if (!node) {
    console.log(`⏭️  ${nodeId}: Non trouvé, skip`);
    continue;
  }

  const currentIcon = node.metadata?.icon || '(aucun)';
  console.log(`📊 ${node.label}: ${currentIcon} → ⚡`);

  const updatedMetadata = {
    ...(node.metadata || {}),
    icon: '⚡'
  };

  await db.treeBranchLeafNode.update({
    where: { id: nodeId },
    data: { metadata: updatedMetadata }
  });
}

console.log('\n✅ Toutes les icônes mises à jour avec ⚡');
console.log('🎯 Rechargez la page pour voir les éclairs sur tous les champs Puissance !');

await db.$disconnect();

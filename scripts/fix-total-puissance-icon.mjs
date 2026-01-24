import { db } from '../src/lib/database.js';

console.log('⚡ Mise à jour de l\'icône du champ "Puissance WC - Total"...\n');

const nodeId = 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-sum-total';

// Récupérer le nœud
const node = await db.treeBranchLeafNode.findUnique({
  where: { id: nodeId },
  select: { label: true, metadata: true }
});

if (!node) {
  console.log('❌ Champ non trouvé');
  await db.$disconnect();
  process.exit(1);
}

console.log(`📊 Champ: ${node.label}`);
console.log(`   Icône actuelle: ${node.metadata?.icon || '(aucun)'}\n`);

// Mettre à jour l'icône
const updatedMetadata = {
  ...(node.metadata || {}),
  icon: '⚡'
};

await db.treeBranchLeafNode.update({
  where: { id: nodeId },
  data: { metadata: updatedMetadata }
});

console.log('✅ Icône mise à jour: ⚡');
console.log('\n🎯 L\'icône éclair apparaîtra maintenant pour le champ "Puissance WC - Total" !');

await db.$disconnect();

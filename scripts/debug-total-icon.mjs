import { db } from '../src/lib/database.js';

console.log('🔍 Vérification de l\'icône "Puissance WC - Total"...\n');

const totalNodeId = 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-sum-total';
const sourceNodeId = 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23';

// Récupérer le nœud Total
const totalNode = await db.treeBranchLeafNode.findUnique({
  where: { id: totalNodeId },
  select: { label: true, metadata: true }
});

// Récupérer le nœud source
const sourceNode = await db.treeBranchLeafNode.findUnique({
  where: { id: sourceNodeId },
  select: { label: true, metadata: true }
});

console.log('📊 Champ SOURCE (Puissance WC):');
console.log(`   Label: ${sourceNode?.label}`);
console.log(`   Icône: ${sourceNode?.metadata?.icon || '(aucune)'}`);
console.log(`   Metadata:`, JSON.stringify(sourceNode?.metadata, null, 2));

console.log('\n📊 Champ TOTAL (Puissance WC - Total):');
console.log(`   Label: ${totalNode?.label}`);
console.log(`   Icône: ${totalNode?.metadata?.icon || '(aucune)'}`);
console.log(`   Metadata:`, JSON.stringify(totalNode?.metadata, null, 2));

if (totalNode?.metadata?.icon !== sourceNode?.metadata?.icon) {
  console.log('\n❌ INCOHÉRENCE DÉTECTÉE !');
  console.log(`   Le Total devrait avoir "${sourceNode?.metadata?.icon}" au lieu de "${totalNode?.metadata?.icon}"`);
  
  // Forcer la mise à jour
  console.log('\n🔧 Application de la correction...');
  
  const updatedMetadata = {
    ...(totalNode.metadata || {}),
    icon: sourceNode?.metadata?.icon || null
  };
  
  await db.treeBranchLeafNode.update({
    where: { id: totalNodeId },
    data: { metadata: updatedMetadata }
  });
  
  console.log('✅ Icône du Total mise à jour avec succès !');
  console.log('🎯 Rechargez la page pour voir le changement');
} else {
  console.log('\n✅ Les icônes sont cohérentes !');
}

await db.$disconnect();

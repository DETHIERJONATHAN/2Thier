import { db } from '../src/lib/database.js';

console.log('🔄 Actualisation des icônes des champs Total pour hériter des sources...\n');

// Trouver tous les champs -sum-total
const sumNodes = await db.treeBranchLeafNode.findMany({
  where: {
    id: { endsWith: '-sum-total' }
  },
  select: {
    id: true,
    label: true,
    metadata: true
  }
});

console.log(`Trouvé ${sumNodes.length} champs Total\n`);

for (const sumNode of sumNodes) {
  // Extraire l'ID du nœud source (retire "-sum-total")
  const sourceNodeId = sumNode.id.replace('-sum-total', '');
  
  // Récupérer le nœud source
  const sourceNode = await db.treeBranchLeafNode.findUnique({
    where: { id: sourceNodeId },
    select: { label: true, metadata: true }
  });
  
  if (!sourceNode) {
    console.log(`⏭️  ${sumNode.label}: Source non trouvée, skip`);
    continue;
  }
  
  const sourceIcon = sourceNode.metadata?.icon || null;
  const currentIcon = sumNode.metadata?.icon || '(aucun)';
  
  console.log(`📊 ${sumNode.label}`);
  console.log(`   Source: ${sourceNode.label} (${sourceIcon || 'aucune icône'})`);
  console.log(`   Icône actuelle: ${currentIcon}`);
  
  if (sourceIcon) {
    // Mettre à jour avec l'icône du source
    const updatedMetadata = {
      ...(sumNode.metadata || {}),
      icon: sourceIcon
    };
    
    await db.treeBranchLeafNode.update({
      where: { id: sumNode.id },
      data: { metadata: updatedMetadata }
    });
    
    console.log(`   ✅ Mise à jour: ${sourceIcon}\n`);
  } else {
    console.log(`   ⏭️  Source sans icône, aucune mise à jour\n`);
  }
}

console.log('✅ Toutes les icônes des champs Total ont été actualisées !');
console.log('🎯 Les totaux héritent maintenant automatiquement des icônes des champs sources');

await db.$disconnect();

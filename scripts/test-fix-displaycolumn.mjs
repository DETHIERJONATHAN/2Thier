import { db } from '../src/lib/database.js';

console.log('🧪 TEST: Vérification de la correction du displayColumn\n');

// Vérifier l'état actuel
const nodeId = 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23-1';
const selectConfig = await db.treeBranchLeafSelectConfig.findUnique({
  where: { nodeId }
});

if (!selectConfig) {
  console.log('❌ SelectConfig non trouvé pour', nodeId);
  await db.$disconnect();
  process.exit(1);
}

console.log('📋 SelectConfig actuel:');
console.log('  displayColumn:', selectConfig.displayColumn);
console.log('  tableReference:', selectConfig.tableReference);

const table = await db.treeBranchLeafNodeTable.findUnique({
  where: { id: selectConfig.tableReference },
  select: { meta: true }
});

console.log('\n📊 Table meta actuel:');
console.log('  meta.lookup.displayColumn:', table?.meta?.lookup?.displayColumn);

// Vérifier si le bug est présent
const metaDisplayCol = table?.meta?.lookup?.displayColumn;
const isBugPresent = Array.isArray(metaDisplayCol) 
  ? metaDisplayCol.some(col => col === 'Puissance' && !col.endsWith('-1'))
  : metaDisplayCol === 'Puissance';

if (isBugPresent) {
  console.log('\n❌ BUG DÉTECTÉ: meta.lookup.displayColumn contient "Puissance" au lieu de "Puissance-1"');
  console.log('\n🔧 Application de la correction...');
  
  // Appliquer le fix manuellement
  const updatedMeta = JSON.parse(JSON.stringify(table.meta));
  if (Array.isArray(updatedMeta.lookup.displayColumn)) {
    updatedMeta.lookup.displayColumn = updatedMeta.lookup.displayColumn.map(col => 
      col === 'Puissance' ? 'Puissance-1' : col
    );
  } else {
    updatedMeta.lookup.displayColumn = 'Puissance-1';
  }
  
  await db.treeBranchLeafNodeTable.update({
    where: { id: selectConfig.tableReference },
    data: { meta: updatedMeta }
  });
  
  console.log('✅ Meta mis à jour:', updatedMeta.lookup.displayColumn);
  console.log('\n🎯 Maintenant, testez le calcul dans l\'interface !');
  console.log('   Le champ "Puissance WC-1" devrait afficher 4200 au lieu de 0');
} else {
  console.log('\n✅ PAS DE BUG: meta.lookup.displayColumn est déjà correct');
}

await db.$disconnect();

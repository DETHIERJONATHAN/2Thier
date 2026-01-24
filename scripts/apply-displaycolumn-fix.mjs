import { db } from '../src/lib/database.js';

console.log('🔧 Application de la correction displayColumn...\n');

const tableId = 'a897ea6c-0c9a-411e-a573-87ebf7629716-1';

const table = await db.treeBranchLeafNodeTable.findUnique({
  where: { id: tableId },
  select: { meta: true, name: true }
});

if (!table) {
  console.log('❌ Table non trouvée');
  await db.$disconnect();
  process.exit(1);
}

console.log('📊 AVANT:', table.name);
console.log('   displayColumn:', table.meta?.lookup?.displayColumn);

const updatedMeta = JSON.parse(JSON.stringify(table.meta));
if (updatedMeta?.lookup?.displayColumn) {
  updatedMeta.lookup.displayColumn = ['Puissance-1'];
}

await db.treeBranchLeafNodeTable.update({
  where: { id: tableId },
  data: { meta: updatedMeta }
});

const updated = await db.treeBranchLeafNodeTable.findUnique({
  where: { id: tableId },
  select: { meta: true }
});

console.log('\n✅ APRÈS correction:');
console.log('   displayColumn:', updated.meta?.lookup?.displayColumn);

console.log('\n🎯 CORRECTION APPLIQUÉE !');
console.log('   Testez maintenant dans l\'interface:');
console.log('   Le champ "Puissance WC-1" devrait afficher 4200 au lieu de 0');

await db.$disconnect();

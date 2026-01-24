import { db } from '../src/lib/database.js';

console.log('🔍 Vérification de TOUTES les tables suffixées...\n');

const baseTableId = 'a897ea6c-0c9a-411e-a573-87ebf7629716';
const suffixes = ['', '-1', '-2', '-3'];

for (const suffix of suffixes) {
  const tableId = `${baseTableId}${suffix}`;
  
  const table = await db.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId },
    select: { 
      name: true, 
      meta: true 
    }
  });
  
  if (!table) {
    console.log(`❌ ${suffix || 'ORIGINAL'}: Table non trouvée`);
    continue;
  }
  
  const displayCol = table.meta?.lookup?.displayColumn;
  const isCorrect = Array.isArray(displayCol) 
    ? displayCol.every(col => suffix === '' ? col === 'Puissance' : col === `Puissance${suffix}`)
    : suffix === '' ? displayCol === 'Puissance' : displayCol === `Puissance${suffix}`;
  
  const status = isCorrect ? '✅' : '❌';
  console.log(`${status} ${suffix || 'ORIGINAL'} (${table.name}):`);
  console.log(`   displayColumn: ${JSON.stringify(displayCol)}`);
  
  if (!isCorrect) {
    console.log(`   ⚠️  DEVRAIT ÊTRE: ${suffix === '' ? '"Puissance"' : `"Puissance${suffix}"`}`);
  }
}

console.log('\n🔍 Vérification des SelectConfig correspondants...\n');

const baseNodeId = 'c8139b2c-b0a8-44e7-8448-137fd2fb8e23';

for (const suffix of suffixes) {
  const nodeId = `${baseNodeId}${suffix}`;
  
  const selectConfig = await db.treeBranchLeafSelectConfig.findUnique({
    where: { nodeId }
  });
  
  if (!selectConfig) {
    console.log(`❌ ${suffix || 'ORIGINAL'}: SelectConfig non trouvé`);
    continue;
  }
  
  const displayCol = selectConfig.displayColumn;
  const isCorrect = suffix === '' ? displayCol === 'Puissance' : displayCol === `Puissance${suffix}`;
  
  const status = isCorrect ? '✅' : '❌';
  console.log(`${status} ${suffix || 'ORIGINAL'} SelectConfig:`);
  console.log(`   displayColumn: "${displayCol}"`);
  
  if (!isCorrect) {
    console.log(`   ⚠️  DEVRAIT ÊTRE: "${suffix === '' ? 'Puissance' : `Puissance${suffix}`}"`);
  }
}

await db.$disconnect();

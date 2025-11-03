#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('🔍 COMPARAISON ORIGINAL vs DUPLIQUÉ\n');

  // ORIGINAL
  const originalId = '440d696a-34cf-418f-8f56-d61015f66d91';
  const original = await p.treeBranchLeafNode.findUnique({
    where: { id: originalId }
  });

  // DUPLIQUÉ
  const duplicateId = '440d696a-34cf-418f-8f56-d61015f66d91-1';
  const duplicate = await p.treeBranchLeafNode.findUnique({
    where: { id: duplicateId }
  });

  console.log('ORIGINAL:');
  console.log(`  ID: ${original.id}`);
  console.log(`  label: ${original.label}`);
  console.log(`  linkedTableIds: ${JSON.stringify(original.linkedTableIds)}`);
  console.log(`  hasTable: ${original.hasTable}`);
  console.log(`  table_name: ${original.table_name}`);

  console.log('\nDUPLIQUÉ:');
  console.log(`  ID: ${duplicate.id}`);
  console.log(`  label: ${duplicate.label}`);
  console.log(`  linkedTableIds: ${JSON.stringify(duplicate.linkedTableIds)}`);
  console.log(`  hasTable: ${duplicate.hasTable}`);
  console.log(`  table_name: ${duplicate.table_name}`);

  console.log('\n═'.repeat(80));
  console.log('STATUS:');
  console.log('═'.repeat(80));

  if (original.linkedTableIds.length > 0) {
    console.log(`✅ ORIGINAL a ${original.linkedTableIds.length} table(s)`);
    console.log('❌ DUPLIQUÉ a 0 tables → PERTE LORS DE LA COPIE');
  } else {
    console.log('❌ MÊME L\'ORIGINAL N\'A PAS DE TABLES');
  }

  // Chercher la table 
  if (original.linkedTableIds.length > 0) {
    console.log(`\n📦 Table originale: ${original.linkedTableIds[0]}`);
    const table = await p.treeBranchLeafNodeTable.findUnique({
      where: { id: original.linkedTableIds[0] }
    });
    if (table) {
      console.log(`   ✅ Trouvée: ${table.name}`);
    }
  }

  await p.$disconnect();
})();

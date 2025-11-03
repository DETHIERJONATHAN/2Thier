const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DIAGNOSTIC: Comparaison Original vs Copie');
    console.log('='.repeat(80));

    // Chercher Orientation (original) et Orientation-1 (copie)
    const original = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Orientation' }
    });

    const copy = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Orientation-1' }
    });

    if (!original || !copy) {
      console.log('❌ Nœuds non trouvés');
      console.log(`   Original: ${original ? '✅' : '❌'}`);
      console.log(`   Copy: ${copy ? '✅' : '❌'}`);
      await prisma.$disconnect();
      return;
    }

    console.log('\n📊 ORIGINAL (Orientation):');
    console.log(`   ID: ${original.id}`);
    console.log(`   table_activeId: "${original.table_activeId}"`);
    console.log(`   Has -1 in activeId: ${original.table_activeId?.includes('-1') ? '✅' : '❌'}`);
    
    const origInstances = original.table_instances || {};
    console.log(`\n   table_instances keys:`);
    for (const key of Object.keys(origInstances)) {
      const value = origInstances[key];
      console.log(`      "${key}"`);
      console.log(`         └─ tableId: "${value?.tableId}"`);
    }

    console.log('\n' + '─'.repeat(80));
    console.log('\n📊 COPIE (Orientation-1):');
    console.log(`   ID: ${copy.id}`);
    console.log(`   table_activeId: "${copy.table_activeId}"`);
    console.log(`   Has -1 in activeId: ${copy.table_activeId?.includes('-1') ? '✅' : '❌'}`);
    
    const copyInstances = copy.table_instances || {};
    console.log(`\n   table_instances keys:`);
    for (const key of Object.keys(copyInstances)) {
      const value = copyInstances[key];
      console.log(`      "${key}"`);
      console.log(`         └─ tableId: "${value?.tableId}"`);
    }

    console.log('\n' + '─'.repeat(80));
    console.log('\n⚠️ PROBLÈMES DÉTECTÉS:');

    // Checker activeId
    if (original.table_activeId && !original.table_activeId.includes('-1')) {
      if (copy.table_activeId && copy.table_activeId.includes('-1')) {
        console.log(`   ✅ table_activeId: Original SANS -1, Copie AVEC -1 (BON!)`);
      } else {
        console.log(`   ❌ table_activeId: Copie n'a pas -1`);
      }
    }

    // Checker instances
    const origKey = Object.keys(origInstances)[0];
    const copyKey = Object.keys(copyInstances)[0];
    
    if (origKey && copyKey) {
      const keyWithoutSuffix = origKey.replace('-1', '');
      const expectedCopyKey = `${keyWithoutSuffix}-1`;
      
      if (copyKey === origKey) {
        console.log(`   ❌ table_instances KEY: Copie a la MÊME clé que l'original!`);
        console.log(`      Original key: "${origKey}"`);
        console.log(`      Copy key: "${copyKey}"`);
        console.log(`      Should be: "${expectedCopyKey}"`);
      } else if (copyKey === expectedCopyKey) {
        console.log(`   ✅ table_instances KEY: Copie a la bonne clé (BON!)`);
      } else {
        console.log(`   ⚠️ table_instances KEY: Copie a une clé inattendue`);
        console.log(`      Expected: "${expectedCopyKey}"`);
        console.log(`      Got: "${copyKey}"`);
      }

      // Checker inner tableId
      const origTableId = origInstances[origKey]?.tableId;
      const copyTableId = copyInstances[copyKey]?.tableId;
      
      if (origTableId && copyTableId) {
        if (copyTableId === origTableId) {
          console.log(`   ❌ table_instances[key].tableId: Copie a le MÊME tableId!`);
          console.log(`      Original tableId: "${origTableId}"`);
          console.log(`      Copy tableId: "${copyTableId}"`);
        } else if (copyTableId.includes('-1') && !origTableId.includes('-1')) {
          console.log(`   ✅ table_instances[key].tableId: Copie a le bon tableId (BON!)`);
        } else {
          console.log(`   ⚠️ table_instances[key].tableId: Problème détecté`);
          console.log(`      Original: "${origTableId}"`);
          console.log(`      Copy: "${copyTableId}"`);
        }
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
})();

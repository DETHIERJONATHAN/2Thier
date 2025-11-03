const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('DIAGNOSTIC 4: Simulation de la copie avec suffixe');
    console.log('='.repeat(80));

    // Chercher Orientation original
    const original = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Orientation' }
    });

    if (!original) {
      console.log('ERREUR: Orientation non trouvee');
      await prisma.$disconnect();
      return;
    }

    console.log('\nNODE ORIGINAL:');
    console.log('   ID: ' + original.id);
    console.log('   table_activeId: ' + original.table_activeId);
    console.log('   table_instances:', JSON.stringify(original.table_instances, null, 2));

    // SIMULATION: Comment deepCopyNodeInternal DEVRAIT copier
    console.log('\n' + '─'.repeat(80));
    console.log('\n🔄 SIMULATION: Ce qu'il devrait copier (avec __copySuffixNum = 1):\n');

    const __copySuffixNum = 1;
    
    // Copier table_activeId
    const newTableActiveId = original.table_activeId 
      ? `${original.table_activeId}-${__copySuffixNum}` 
      : null;
    
    console.log(`✅ table_activeId:`);
    console.log(`   Original: "${original.table_activeId}"`);
    console.log(`   Copie:    "${newTableActiveId}"`);

    // Copier table_instances
    console.log(`\n✅ table_instances:`);
    
    if (!original.table_instances || typeof original.table_instances !== 'object') {
      console.log(`   (vide ou null)`);
    } else {
      const updatedInstances = {};
      for (const [key, value] of Object.entries(original.table_instances)) {
        const newKey = key.includes('-') ? key : `${key}-${__copySuffixNum}`;
        
        console.log(`   Clé original:  "${key}"`);
        console.log(`   Clé copie:     "${newKey}" ${key === newKey ? '❌ IDENTIQUE!' : '✅'}`);
        
        if (value && typeof value === 'object') {
          const updatedObj = { ...value };
          if (value.tableId && typeof value.tableId === 'string') {
            const oldTableId = value.tableId;
            updatedObj.tableId = oldTableId.includes('-') 
              ? oldTableId 
              : `${oldTableId}-${__copySuffixNum}`;
            
            console.log(`   tableId original: "${oldTableId}"`);
            console.log(`   tableId copie:    "${updatedObj.tableId}" ${oldTableId === updatedObj.tableId ? '❌ IDENTIQUE!' : '✅'}`);
          }
          updatedInstances[newKey] = updatedObj;
        } else {
          updatedInstances[newKey] = value;
        }
      }
      
      console.log(`\n   📦 Résultat:`, JSON.stringify(updatedInstances, null, 2));
    }

    // VÉRIFICATION: Comparer avec ce qui est RÉELLEMENT en base
    console.log('\n' + '─'.repeat(80));
    console.log('\n⚠️ VÉRIFICATION: Comparer avec la copie réelle\n');

    const actualCopy = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Orientation-1' }
    });

    if (actualCopy) {
      console.log('📊 COPIE RÉELLE en base:');
      console.log(`   table_activeId: ${actualCopy.table_activeId}`);
      console.log(`   table_instances:`, JSON.stringify(actualCopy.table_instances, null, 2));

      // Comparer
      console.log('\n📊 COMPARAISON:');
      console.log(`   activeId OK: ${actualCopy.table_activeId === newTableActiveId ? '✅' : '❌'}`);
      
      if (actualCopy.table_instances && Object.keys(actualCopy.table_instances).length > 0) {
        const actualKey = Object.keys(actualCopy.table_instances)[0];
        const expectedKey = Object.keys(original.table_instances)[0];
        const fullExpectedKey = expectedKey.includes('-') ? expectedKey : `${expectedKey}-1`;
        
        console.log(`   instances key OK: ${actualKey === fullExpectedKey ? '✅' : '❌'}`);
        console.log(`      Expected: "${fullExpectedKey}"`);
        console.log(`      Got: "${actualKey}"`);
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
  }
})();

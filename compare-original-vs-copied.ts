import { db } from './src/lib/database';

async function debug() {
  try {
    console.log(`\n📊 Comparaison ORIGINAL vs COPIÉ\n`);
    
    const originalId = 'c071a466-5a0f-4b4e-afb0-fd69ac79d51a';
    const copiedId = originalId + '-1';
    
    const original = await db.treeBranchLeafSelectConfig.findFirst({
      where: { nodeId: originalId }
    });
    
    const copied = await db.treeBranchLeafSelectConfig.findFirst({
      where: { nodeId: copiedId }
    });
    
    if (!original || !copied) {
      console.log('❌ Manque original ou copié');
      process.exit(1);
    }
    
    console.log('ORIGINAL:');
    console.log(`  keyColumn: "${original.keyColumn}"`);
    console.log(`  valueColumn: "${original.valueColumn}"`);
    console.log(`  displayColumn: "${original.displayColumn}"`);
    console.log(`  dependsOnNodeId: ${original.dependsOnNodeId}`);
    console.log(`  tableReference: ${original.tableReference}`);
    
    console.log('\nCOPIÉ:');
    console.log(`  keyColumn: "${copied.keyColumn}"`);
    console.log(`  valueColumn: "${copied.valueColumn}"`);
    console.log(`  displayColumn: "${copied.displayColumn}"`);
    console.log(`  dependsOnNodeId: ${copied.dependsOnNodeId}`);
    console.log(`  tableReference: ${copied.tableReference}`);
    
    console.log('\n❓ COMPARAISON:');
    console.log(`  keyColumn SUFFIXÉ? ${original.keyColumn === copied.keyColumn.replace('-1', '')} (orig="${original.keyColumn}", copy="${copied.keyColumn}")`);
    console.log(`  dependsOnNodeId SUFFIXÉ? ${original.dependsOnNodeId === copied.dependsOnNodeId?.replace('-1', '')} (orig="${original.dependsOnNodeId}", copy="${copied.dependsOnNodeId}")`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erreur:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

debug();

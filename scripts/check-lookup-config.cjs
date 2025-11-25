/**
 * 🔍 VÉRIFICATION: État complet de la configuration lookup
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TABLE_ID = 'ef909547-ebd4-44b6-b9cb-7f4ef74e95d1';

async function checkLookupConfig() {
  console.log('🔍 ========== VÉRIFICATION CONFIGURATION LOOKUP ==========\n');
  
  try {
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: TABLE_ID }
    });
    
    if (!table) {
      console.log('❌ Table introuvable!');
      return;
    }
    
    console.log(`✅ Table: ${table.name}\n`);
    console.log('📋 Métadonnées complètes:\n');
    console.log(JSON.stringify(table.meta, null, 2));
    
    const lookup = table.meta?.lookup;
    
    if (!lookup) {
      console.log('\n❌ PROBLÈME: Aucune configuration lookup trouvée dans meta!');
      console.log('\n💡 Solution: Active le toggle "Lookup COLONNE" dans l\'interface');
      return;
    }
    
    console.log('\n📊 Configuration lookup détectée:');
    console.log(`   enabled: ${lookup.enabled}`);
    console.log(`   columnLookupEnabled: ${lookup.columnLookupEnabled}`);
    console.log(`   rowLookupEnabled: ${lookup.rowLookupEnabled}`);
    
    if (lookup.columnSourceOption) {
      console.log('\n📋 Column source option:');
      console.log(`   type: ${lookup.columnSourceOption.type}`);
      console.log(`   operator: ${lookup.columnSourceOption.operator}`);
      console.log(`   comparisonColumn: ${lookup.columnSourceOption.comparisonColumn}`);
      console.log(`   sourceField: ${lookup.columnSourceOption.sourceField}`);
    }
    
    console.log(`\n   displayColumn: ${lookup.displayColumn}`);
    
    if (!lookup.enabled) {
      console.log('\n⚠️ PROBLÈME: lookup.enabled = false');
      console.log('💡 Solution: Active le toggle dans l\'interface');
    }
    
    if (!lookup.columnLookupEnabled) {
      console.log('\n⚠️ PROBLÈME: columnLookupEnabled = false');
      console.log('💡 Solution: Active "Lookup COLONNE"');
    }
    
  } catch (error) {
    console.error('❌ ERREUR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkLookupConfig().catch(console.error);

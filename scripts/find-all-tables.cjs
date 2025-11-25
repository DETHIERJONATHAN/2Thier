/**
 * 🔍 RECHERCHE: Trouve toutes les tables dans la base
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findTables() {
  console.log('🔍 ========== RECHERCHE DES TABLES ==========\n');
  
  try {
    const tables = await prisma.treeBranchLeafNodeTable.findMany({
      select: {
        id: true,
        name: true,
        meta: true
      }
    });
    
    console.log(`📊 Total: ${tables.length} tables trouvées\n`);
    
    if (tables.length === 0) {
      console.log('❌ Aucune table dans la base!');
      return;
    }
    
    tables.forEach((table, idx) => {
      console.log(`\n─────────── Table ${idx + 1} ───────────`);
      console.log(`ID: ${table.id}`);
      console.log(`Nom: ${table.name}`);
      
      const meta = table.meta;
      const lookup = meta?.lookup;
      
      if (lookup) {
        console.log('✅ A une config lookup:');
        console.log(`   enabled: ${lookup.enabled}`);
        console.log(`   columnLookupEnabled: ${lookup.columnLookupEnabled}`);
        console.log(`   rowLookupEnabled: ${lookup.rowLookupEnabled}`);
        
        if (lookup.columnSourceOption) {
          console.log('   Column source:');
          console.log(`      type: ${lookup.columnSourceOption.type}`);
          console.log(`      operator: ${lookup.columnSourceOption.operator}`);
          console.log(`      comparisonColumn: ${lookup.columnSourceOption.comparisonColumn}`);
        }
        
        if (lookup.displayColumn) {
          console.log(`   displayColumn: ${JSON.stringify(lookup.displayColumn)}`);
        }
      } else {
        console.log('⚪ Pas de config lookup');
      }
    });
    
    // Chercher spécifiquement une table avec "Coef" ou "Prime" dans le nom
    console.log('\n\n🔎 Tables avec "Coef" ou "Prime" dans le nom:');
    const matching = tables.filter(t => 
      t.name.toLowerCase().includes('coef') || 
      t.name.toLowerCase().includes('prime')
    );
    
    if (matching.length > 0) {
      console.log(`\n✅ ${matching.length} table(s) trouvée(s):\n`);
      matching.forEach(t => {
        console.log(`   ${t.name}`);
        console.log(`   ID: ${t.id}\n`);
      });
    } else {
      console.log('\n❌ Aucune table avec ces noms');
    }
    
  } catch (error) {
    console.error('\n❌ ERREUR:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

findTables().catch(console.error);

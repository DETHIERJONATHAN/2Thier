const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOnduleurTable() {
  console.log('\n🔍 RECHERCHE DE LA TABLE SOURCE DES ONDULEURS\n');
  
  // Chercher les tables qui contiennent "onduleur" dans leur nom ou label
  const tables = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: { contains: 'Onduleur', mode: 'insensitive' } },
        { label: { contains: 'onduleur', mode: 'insensitive' } },
        { table_name: { contains: 'onduleur', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      label: true,
      type: true,
      table_name: true,
      table_type: true,
      table_meta: true,
      hasTable: true
    }
  });

  console.log(`Trouvé ${tables.length} résultats:\n`);
  
  tables.forEach((table, index) => {
    console.log(`\n${index + 1}. "${table.label}"`);
    console.log(`   ID: ${table.id}`);
    console.log(`   Type: ${table.type}`);
    console.log(`   table_name: ${table.table_name}`);
    console.log(`   table_type: ${table.table_type}`);
    console.log(`   hasTable: ${table.hasTable}`);
    
    if (table.table_meta) {
      console.log(`   ✅ table_meta EXISTE`);
      
      if (table.table_meta.lookup) {
        console.log(`   ✅ table_meta.lookup EXISTE`);
        
        if (table.table_meta.lookup.columnSourceOption) {
          console.log(`   🔥 FILTRAGE ÉTAPE 2.5 CONFIGURÉ:`);
          const cfg = table.table_meta.lookup.columnSourceOption;
          console.log(`      filterColumn: ${cfg.filterColumn}`);
          console.log(`      filterOperator: ${cfg.filterOperator}`);
          console.log(`      filterValueRef: ${cfg.filterValueRef}`);
        }
      } else {
        console.log(`   ❌ table_meta.lookup N'EXISTE PAS`);
        console.log(`   Clés dans table_meta: ${Object.keys(table.table_meta).join(', ')}`);
      }
    } else {
      console.log(`   ❌ table_meta est NULL`);
    }
  });
  
  await prisma.$disconnect();
}

findOnduleurTable();

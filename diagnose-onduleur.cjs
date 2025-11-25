const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOnduleurField() {
  console.log('\n🔍 DIAGNOSTIC COMPLET DU CHAMP ONDULEUR\n');
  console.log('═'.repeat(80));
  
  const field = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'a3b9db61-3b95-48ef-b10f-36a43446fbf1' },
    select: {
      id: true,
      label: true,
      type: true,
      fieldType: true,
      hasTable: true,
      table_activeId: true,
      table_instances: true,
      table_meta: true
    }
  });

  if (!field) {
    console.error('❌ Champ introuvable');
    process.exit(1);
  }

  console.log('\n📋 CHAMP "Onduleur":');
  console.log(`   ID: ${field.id}`);
  console.log(`   Label: ${field.label}`);
  console.log(`   Type: ${field.type}`);
  console.log(`   hasTable: ${field.hasTable}`);
  console.log(`   table_activeId: ${field.table_activeId}`);
  
  console.log('\n🔍 TABLE_INSTANCES:');
  console.log('   Type:', typeof field.table_instances);
  console.log('   Value:', JSON.stringify(field.table_instances, null, 2));
  
  if (!field.table_instances) {
    console.log('   ❌ NULL');
  } else if (Array.isArray(field.table_instances)) {
    console.log(`   ✅ Array avec ${field.table_instances.length} instance(s)`);
    field.table_instances.forEach((inst, i) => {
      console.log(`\n   Instance ${i + 1}:`);
      console.log(`      id: ${inst.id}`);
      console.log(`      name: ${inst.name}`);
      console.log(`      type: ${inst.type}`);
      
      if (inst.meta) {
        console.log(`      meta: EXISTS`);
        if (inst.meta.lookup?.columnSourceOption) {
          console.log('\n      🔥 FILTRAGE ÉTAPE 2.5 CONFIGURÉ:');
          const cfg = inst.meta.lookup.columnSourceOption;
          console.log(`         filterColumn: ${cfg.filterColumn}`);
          console.log(`         filterOperator: ${cfg.filterOperator}`);
          console.log(`         filterValueRef: ${cfg.filterValueRef}`);
        }
      } else {
        console.log(`      meta: NULL`);
      }
    });
  }

  console.log('\n═'.repeat(80));
  console.log('\n🎯 CONCLUSION:\n');
  
  if (!field.table_instances || field.table_instances.length === 0) {
    console.log('❌ Le champ Onduleur N\'A AUCUNE TABLE INSTANCE');
    console.log('   Cela signifie que:');
    console.log('   1. Tu n\'as jamais créé de table pour ce champ');
    console.log('   2. OU la table a été supprimée');
    console.log('   3. OU le champ utilise une AUTRE table (via data_instances)');
    console.log('\n💡 SOLUTION:');
    console.log('   - Va dans TablePanel du champ "Onduleur"');
    console.log('   - Crée une nouvelle table (ou sélectionne une existante)');
    console.log('   - Configure ÉTAPE 2.5');
    console.log('   - Sauvegarde');
    console.log('   - ALORS la config sera dans table_instances[X].meta.lookup.columnSourceOption');
  }
  
  await prisma.$disconnect();
}

checkOnduleurField();

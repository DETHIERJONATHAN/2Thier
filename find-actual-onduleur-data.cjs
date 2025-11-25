const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findOnduleurData() {
  console.log('\n🔍 RECHERCHE DES DONNÉES RÉELLES DU CHAMP ONDULEUR\n');
  console.log('═'.repeat(80));
  
  const field = await prisma.treeBranchLeafNode.findUnique({
    where: { id: 'a3b9db61-3b95-48ef-b10f-36a43446fbf1' }
  });

  if (!field) {
    console.error('❌ Champ introuvable');
    process.exit(1);
  }

  console.log('\n📋 INFORMATIONS COMPLÈTES DU CHAMP:\n');
  console.log(`Label: ${field.label}`);
  console.log(`Type: ${field.type}`);
  console.log(`fieldType: ${field.fieldType}`);
  console.log(`hasData: ${field.hasData}`);
  console.log(`hasTable: ${field.hasTable}`);
  
  console.log('\n🔍 DATA CONFIG:');
  console.log(`data_activeId: ${field.data_activeId}`);
  console.log(`data_sourceType: ${field.data_instances ? JSON.stringify(field.data_instances[0]?.sourceType) : 'N/A'}`);
  
  if (field.data_instances && field.data_instances.length > 0) {
    console.log('\n📊 DATA INSTANCES:');
    field.data_instances.forEach((instance, i) => {
      console.log(`\n   Instance ${i + 1}:`);
      console.log(`   - id: ${instance.id}`);
      console.log(`   - sourceType: ${instance.sourceType}`);
      console.log(`   - sourceRef: ${instance.sourceRef}`);
      
      if (instance.sourceRef) {
        const tableIdMatch = instance.sourceRef.match(/@table\.([a-f0-9-]+)/);
        if (tableIdMatch) {
          console.log(`   🎯 TABLE ID EXTRAIT: ${tableIdMatch[1]}`);
        }
      }
    });
  }

  console.log('\n🔍 TABLE CONFIG:');
  console.log(`table_activeId: ${field.table_activeId}`);
  
  if (field.table_instances && field.table_instances.length > 0) {
    console.log('\n📊 TABLE INSTANCES:');
    field.table_instances.forEach((instance, i) => {
      console.log(`\n   Instance ${i + 1}:`);
      console.log(`   - id: ${instance.id}`);
      console.log(`   - name: ${instance.name}`);
      console.log(`   - type: ${instance.type}`);
      console.log(`   - meta: ${instance.meta ? 'EXISTS' : 'NULL'}`);
      
      if (instance.meta) {
        console.log('\n   📋 META CONTENT:');
        console.log(JSON.stringify(instance.meta, null, 6));
        
        if (instance.meta.lookup?.columnSourceOption) {
          console.log('\n   🔥🔥🔥 FILTRAGE ÉTAPE 2.5 TROUVÉ ICI!');
          const cfg = instance.meta.lookup.columnSourceOption;
          console.log(`      filterColumn: ${cfg.filterColumn}`);
          console.log(`      filterOperator: ${cfg.filterOperator}`);
          console.log(`      filterValueRef: ${cfg.filterValueRef}`);
        }
      }
    });
  }

  // Chercher la table réelle référencée
  if (field.data_instances && field.data_instances.length > 0) {
    const sourceRef = field.data_instances[0].sourceRef;
    if (sourceRef) {
      const tableIdMatch = sourceRef.match(/@table\.([a-f0-9-]+)/);
      if (tableIdMatch) {
        const tableId = tableIdMatch[1];
        console.log('\n\n🔍 RECHERCHE DE LA TABLE RÉFÉRENCÉE:', tableId);
        
        const referencedTable = await prisma.treeBranchLeafNode.findUnique({
          where: { id: tableId },
          select: {
            id: true,
            label: true,
            table_name: true,
            table_type: true,
            table_meta: true
          }
        });

        if (referencedTable) {
          console.log(`\n   ✅ Table trouvée: "${referencedTable.label}"`);
          console.log(`   table_name: ${referencedTable.table_name}`);
          console.log(`   table_type: ${referencedTable.table_type}`);
          
          if (referencedTable.table_meta) {
            console.log('\n   📋 TABLE_META:');
            console.log(JSON.stringify(referencedTable.table_meta, null, 4));
            
            if (referencedTable.table_meta.lookup?.columnSourceOption) {
              console.log('\n   🔥🔥🔥 FILTRAGE ÉTAPE 2.5 TROUVÉ DANS LA TABLE SOURCE!');
              const cfg = referencedTable.table_meta.lookup.columnSourceOption;
              console.log(`      filterColumn: ${cfg.filterColumn}`);
              console.log(`      filterOperator: ${cfg.filterOperator}`);
              console.log(`      filterValueRef: ${cfg.filterValueRef}`);
            }
          } else {
            console.log('\n   ❌ table_meta est NULL sur la table source');
          }
        }
      }
    }
  }

  console.log('\n═'.repeat(80));
  console.log('✅ ANALYSE TERMINÉE\n');
  
  await prisma.$disconnect();
}

findOnduleurData();

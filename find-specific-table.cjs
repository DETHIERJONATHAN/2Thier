const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findSpecificTable() {
  try {
    console.log('\n🔍 RECHERCHE: Table avec ID bd05f3df-2666-4ca7-8563-8e6e9c2006ce\n');
    
    // Chercher directement cet ID
    const table = await prisma.treeBranchLeafNode.findUnique({
      where: { id: 'bd05f3df-2666-4ca7-8563-8e6e9c2006ce' }
    });

    if (table) {
      console.log('✅ TABLE TROUVÉE !');
      console.log('   ID:', table.id);
      console.log('   Label:', table.label);
      console.log('   Type:', table.type);
      console.log('   table_name:', table.table_name);
      console.log('   table_type:', table.table_type);
      console.log('   hasTable:', table.hasTable);
      console.log('');
      
      if (table.table_columns) {
        const columns = typeof table.table_columns === 'string'
          ? JSON.parse(table.table_columns)
          : table.table_columns;
        console.log('📋 COLONNES:', JSON.stringify(columns, null, 2));
      }
      
      if (table.table_data) {
        const data = typeof table.table_data === 'string'
          ? JSON.parse(table.table_data)
          : table.table_data;
        console.log(`\n📊 DONNÉES: ${data.length} lignes`);
        if (data.length > 0) {
          console.log('   Première ligne:', JSON.stringify(data[0]));
          console.log('   Deuxième ligne:', JSON.stringify(data[1]));
        }
      }
      
      if (table.table_instances) {
        const instances = typeof table.table_instances === 'string'
          ? JSON.parse(table.table_instances)
          : table.table_instances;
        console.log('\n🔍 TABLE_INSTANCES:', JSON.stringify(instances, null, 2));
      }

      console.log('\n' + '='.repeat(80));
      console.log('✅ La table EXISTE dans la base de données !');
      console.log('   Elle contient les données des onduleurs.');
      console.log('');
      console.log('💡 Maintenant vérifions la configuration ÉTAPE 2.5...');
      console.log('='.repeat(80) + '\n');
      
    } else {
      console.log('❌ TABLE NON TROUVÉE avec cet ID');
      console.log('');
      console.log('Cherchons toutes les tables "Import Onduleur"...');
      
      const onduleurTables = await prisma.treeBranchLeafNode.findMany({
        where: {
          OR: [
            { table_name: { contains: 'Import Onduleur', mode: 'insensitive' } },
            { label: { contains: 'Import Onduleur', mode: 'insensitive' } }
          ]
        }
      });

      console.log(`\n✅ ${onduleurTables.length} tables trouvées:`);
      onduleurTables.forEach(t => {
        console.log(`   - ID: ${t.id}`);
        console.log(`     Label: ${t.label}`);
        console.log(`     Name: ${t.table_name}`);
        console.log('');
      });
    }

    // Maintenant vérifions le champ Onduleur et sa config ÉTAPE 2.5
    console.log('\n🔍 VÉRIFICATION CHAMP "Onduleur" ET ÉTAPE 2.5:\n');
    
    const onduleurField = await prisma.treeBranchLeafNode.findUnique({
      where: { id: 'a3b9db61-3b95-48ef-b10f-36a43446fbf1' }
    });

    if (onduleurField.table_instances) {
      const instances = typeof onduleurField.table_instances === 'string'
        ? JSON.parse(onduleurField.table_instances)
        : onduleurField.table_instances;
      
      console.log('📋 TABLE_INSTANCES du champ Onduleur:');
      console.log(JSON.stringify(instances, null, 2));
      
      // Vérifier si la config ÉTAPE 2.5 existe
      const activeInstance = instances[onduleurField.table_activeId];
      if (activeInstance) {
        console.log('\n🔍 INSTANCE ACTIVE:');
        console.log(JSON.stringify(activeInstance, null, 2));
        
        if (activeInstance.meta?.lookup?.columnSourceOption) {
          console.log('\n✅ CONFIGURATION ÉTAPE 2.5 TROUVÉE !');
          console.log(JSON.stringify(activeInstance.meta.lookup.columnSourceOption, null, 2));
        } else {
          console.log('\n❌ PAS DE CONFIGURATION ÉTAPE 2.5 !');
          console.log('   meta:', activeInstance.meta);
          console.log('');
          console.log('💡 La configuration ÉTAPE 2.5 n\'a JAMAIS été sauvegardée !');
        }
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findSpecificTable();

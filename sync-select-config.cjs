const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncSelectConfigFromMetadata() {
  console.log('🔧 SYNCHRONISATION selectConfig DEPUIS metadata\n');
  console.log('='.repeat(100));

  const fields = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: {
        in: [
          '682ef657-4af8-45ac-8cd5-153a56a8bb74',  // Inclinaison
          '682ef657-4af8-45ac-8cd5-153a56a8bb74-1' // Inclinaison-1
        ]
      }
    }
  });

  for (const field of fields) {
    console.log(`\n📊 ${field.label}`);
    
    // Extraire la config depuis table_instances
    const instances = field.table_instances;
    if (!instances || typeof instances !== 'object') {
      console.log('❌ Pas de table_instances');
      continue;
    }

    const firstKey = Object.keys(instances)[0];
    const instance = instances[firstKey];
    
    console.log('Source (table_instances):');
    console.log('  type:', instance.type);
    console.log('  keyRow:', instance.keyRow);
    console.log('  keyColumn:', instance.keyColumn);
    console.log('  tableId:', instance.tableId);

    // Mettre à jour ou créer le selectConfig
    const { randomUUID } = require('crypto');
    
    await prisma.treeBranchLeafSelectConfig.upsert({
      where: { nodeId: field.id },
      create: {
        id: randomUUID(),
        nodeId: field.id,
        options: [],
        multiple: false,
        searchable: true,
        allowCustom: false,
        optionsSource: 'table',
        tableReference: instance.tableId || field.table_activeId,
        keyColumn: instance.keyColumn || null,
        keyRow: instance.keyRow || null,
        valueColumn: null,
        valueRow: null,
        displayColumn: null,
        displayRow: null,
        dependsOnNodeId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      update: {
        optionsSource: 'table',
        tableReference: instance.tableId || field.table_activeId,
        keyColumn: instance.keyColumn || null,
        keyRow: instance.keyRow || null,
        updatedAt: new Date(),
      }
    });

    console.log('✅ selectConfig synchronisé:');
    console.log('  keyRow:', instance.keyRow || null);
    console.log('  keyColumn:', instance.keyColumn || null);
  }

  console.log('\n\n✅ SYNCHRONISATION TERMINÉE !');

  await prisma.$disconnect();
}

syncSelectConfigFromMetadata().catch(console.error);

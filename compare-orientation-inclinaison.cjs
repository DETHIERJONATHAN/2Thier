const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function compareConfigs() {
  console.log('🔍 COMPARAISON ORIENTATION VS INCLINAISON\n');
  console.log('='.repeat(100));

  const fields = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: {
        in: [
          '028f9ec3-1275-4e12-84a8-674bf4fc6b2c', // Orientation
          '682ef657-4af8-45ac-8cd5-153a56a8bb74', // Inclinaison
          '028f9ec3-1275-4e12-84a8-674bf4fc6b2c-1', // Orientation-1
          '682ef657-4af8-45ac-8cd5-153a56a8bb74-1'  // Inclinaison-1
        ]
      }
    },
    select: {
      id: true,
      label: true,
      table_activeId: true,
      table_instances: true,
      metadata: true
    }
  });

  for (const field of fields) {
    console.log(`\n${'='.repeat(100)}`);
    console.log(`📊 ${field.label}`);
    console.log('ID:', field.id);
    console.log('table_activeId:', field.table_activeId);

    // table_instances (source de vérité pour le backend)
    console.log('\n📋 table_instances:');
    const instances = field.table_instances;
    if (instances && typeof instances === 'object') {
      for (const [key, value] of Object.entries(instances)) {
        console.log(`  [${key}]:`);
        console.log('    type:', value.type);
        console.log('    keyRow:', value.keyRow);
        console.log('    keyColumn:', value.keyColumn);
        console.log('    rowBased:', value.rowBased);
        console.log('    columnBased:', value.columnBased);
      }
    }

    // metadata.capabilities.table (doit correspondre)
    const capTable = field.metadata?.capabilities?.table;
    if (capTable) {
      console.log('\n📋 metadata.capabilities.table:');
      if (capTable.instances) {
        for (const [key, value] of Object.entries(capTable.instances)) {
          console.log(`  [${key}]:`);
          console.log('    type:', value.type);
          console.log('    keyRow:', value.keyRow);
          console.log('    keyColumn:', value.keyColumn);
          console.log('    rowBased:', value.rowBased);
          console.log('    columnBased:', value.columnBased);
        }
      }
    }
  }

  await prisma.$disconnect();
}

compareConfigs().catch(console.error);

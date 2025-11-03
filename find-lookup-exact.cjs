const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 CHERCHANT QUI EST LE LOOKUP EXACTEMENT\n');

  // 1️⃣ La variable copiée
  const varId = '89160843-6d16-48d6-864c-bed84798011d-1';
  const var1 = await prisma.treeBranchLeafNodeVariable.findUnique({
    where: { id: varId }
  });

  console.log('1️⃣ VARIABLE COPIÉE:');
  console.log(`   ID: ${var1?.id}`);
  console.log(`   nodeId (nœud propriétaire): ${var1?.nodeId}`);
  console.log(`   sourceRef: ${var1?.sourceRef}`);

  // 2️⃣ Le nœud qui CONTIENT cette variable
  const ownerNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: var1?.nodeId },
    select: {
      id: true,
      label: true,
      table_activeId: true,
      table_instances: true,
      hasTable: true
    }
  });

  console.log('\n2️⃣ NŒUD PROPRIÉTAIRE (qui contient la variable):');
  console.log(`   ID: ${ownerNode?.id}`);
  console.log(`   Label: ${ownerNode?.label}`);
  console.log(`   hasTable: ${ownerNode?.hasTable}`);
  console.log(`   table_activeId: ${ownerNode?.table_activeId}`);
  console.log(`   table_instances: ${ownerNode?.table_instances ? 'OUI' : 'NON'}`);
  if (ownerNode?.table_instances) {
    console.log(`      Clés: ${Object.keys(ownerNode.table_instances).join(', ')}`);
  }

  // 3️⃣ La table de la variable
  const match = var1?.sourceRef?.match(/@table\.(.+)$/);
  const tableId = match?.[1];
  
  if (!tableId) {
    console.log('\n❌ Pas de table trouvée');
    await prisma.$disconnect();
    return;
  }

  console.log(`\n3️⃣ TABLE DE LA VARIABLE:`);
  console.log(`   ID: ${tableId}`);

  const table = await prisma.treeBranchLeafNodeTable.findUnique({
    where: { id: tableId }
  });

  if (table) {
    console.log(`   ✅ Table trouvée`);
    console.log(`   meta.lookup: ${table.meta ? (table.meta as any).lookup ? 'OUI' : 'NON' : 'NON'}`);
    
    if ((table.meta as any)?.lookup) {
      const lookup = (table.meta as any).lookup;
      console.log(`      - enabled: ${lookup.enabled}`);
      console.log(`      - rowLookupEnabled: ${lookup.rowLookupEnabled}`);
      console.log(`      - columnLookupEnabled: ${lookup.columnLookupEnabled}`);
      console.log(`      - selectors.rowFieldId: ${lookup.selectors?.rowFieldId}`);
      console.log(`      - selectors.columnFieldId: ${lookup.selectors?.columnFieldId}`);
    }
  } else {
    console.log(`   ❌ Table NON trouvée avec ID: ${tableId}`);
  }

  // 4️⃣ Les nœuds SELECTORS (rowFieldId, columnFieldId)
  console.log('\n4️⃣ NŒUDS SELECTORS:');
  
  if ((table?.meta as any)?.lookup?.selectors) {
    const selectors = (table.meta as any).lookup.selectors;
    
    if (selectors.rowFieldId) {
      const rowField = await prisma.treeBranchLeafNode.findUnique({
        where: { id: selectors.rowFieldId },
        select: {
          id: true,
          label: true,
          type: true,
          table_activeId: true,
          table_instances: true
        }
      });
      console.log(`   Row Selector (${selectors.rowFieldId}):`);
      console.log(`      Label: ${rowField?.label}`);
      console.log(`      Type: ${rowField?.type}`);
      console.log(`      table_activeId: ${rowField?.table_activeId}`);
      console.log(`      table_instances: ${rowField?.table_instances ? 'OUI' : 'NON'}`);
    }

    if (selectors.columnFieldId) {
      const colField = await prisma.treeBranchLeafNode.findUnique({
        where: { id: selectors.columnFieldId },
        select: {
          id: true,
          label: true,
          type: true,
          table_activeId: true,
          table_instances: true
        }
      });
      console.log(`   Column Selector (${selectors.columnFieldId}):`);
      console.log(`      Label: ${colField?.label}`);
      console.log(`      Type: ${colField?.type}`);
      console.log(`      table_activeId: ${colField?.table_activeId}`);
      console.log(`      table_instances: ${colField?.table_instances ? 'OUI' : 'NON'}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);

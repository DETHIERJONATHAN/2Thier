require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function query() {
  const result = await prisma.$queryRaw`
    SELECT 
      id, label, type, "subType", "parentId", table_activeId
    FROM "TreeBranchLeafNode"
    WHERE LOWER(label) LIKE '%orientation%' OR LOWER(label) LIKE '%inclinaison%'
    ORDER BY label
  `;
  
  console.log('📋 Nodes containing "Orientation" or "Inclinaison":\n');
  for (const node of result) {
    console.log(`  • ${node.label}`);
    console.log(`    ID: ${node.id}`);
    console.log(`    Type: ${node.type}/${node.subType}`);
    console.log(`    ParentId: ${node.parentId}`);
    console.log(`    table_activeId: ${node.table_activeId || 'null'}`);
    
    // Get SelectConfig
    const cfg = await prisma.$queryRaw`
      SELECT * FROM "TreeBranchLeafSelectConfig" WHERE "nodeId" = ${node.id}
    `;
    if (cfg.length > 0) {
      console.log(`    SelectConfig:`);
      console.log(`      optionsSource: ${cfg[0].optionsSource}`);
      console.log(`      tableReference: ${cfg[0].tableReference}`);
      console.log(`      keyColumn: ${cfg[0].keyColumn}`);
      console.log(`      keyRow: ${cfg[0].keyRow}`);
    }
    console.log('');
  }
}

query()
  .catch(e => console.error('ERROR:', e.message))
  .finally(() => prisma.$disconnect());

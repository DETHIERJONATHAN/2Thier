#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('🔍 Recherche de nœuds avec "Orientation - inclinaison"...\n');
  
  const nodes = await p.treeBranchLeafNode.findMany({
    where: {
      label: { contains: 'Orientation - inclinaison' }
    },
    select: {
      id: true,
      label: true,
      type: true,
      table_activeId: true,
      table_name: true,
      hasTable: true
    }
  });
  
  console.log(`Trouvé ${nodes.length} nœuds:\n`);
  nodes.forEach((node, idx) => {
    console.log(`[${idx}]`);
    console.log(`  ID: ${node.id}`);
    console.log(`  Label: ${node.label}`);
    console.log(`  Type: ${node.type}`);
    console.log(`  table_activeId: ${node.table_activeId}`);
    console.log(`  table_name: ${node.table_name}`);
    console.log(`  hasTable: ${node.hasTable}`);
    console.log('');
  });
  
  await p.$disconnect();
})();

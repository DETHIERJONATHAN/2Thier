#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  const nodes = await p.treeBranchLeafNode.findMany({
    where: {
      id: { contains: '9bc0622c' }
    },
    select: {
      id: true,
      label: true,
      table_activeId: true,
      table_instances: true
    }
  });
  console.log(JSON.stringify(nodes, null, 2));
  await p.$disconnect();
})();

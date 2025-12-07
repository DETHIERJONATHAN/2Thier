#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const nodeId = process.argv[2];
if (!nodeId) {
  console.error('Usage: node tmp/show-node-by-id.cjs <nodeId>');
  process.exit(1);
}

(async () => {
  try {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: nodeId },
      select: { id: true, label: true, parentId: true, subtab: true, metadata: true }
    });
    console.log(node);
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();

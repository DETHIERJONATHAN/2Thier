#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const id = process.argv[2];
    if (!id) {
      console.error('Usage: node scripts/find-node-by-id.cjs <nodeId>');
      process.exit(1);
    }
    const n = await prisma.treeBranchLeafNode.findUnique({
      where: { id },
      select: { id: true, treeId: true, parentId: true, type: true, subType: true, fieldType: true, fieldSubType: true, label: true, linkedVariableIds: true, data_exposedKey: true }
    });
    console.log(n || null);
  } catch (e) {
    console.error('Erreur:', e);
    process.exit(10);
  } finally {
    await prisma.$disconnect();
  }
}

main();

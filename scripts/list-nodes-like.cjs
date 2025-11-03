#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    const pattern = process.argv[2] || '';
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { label: { contains: pattern } },
      select: { id: true, label: true, type: true, subType: true, linkedVariableIds: true, data_exposedKey: true }
    });
    console.log(nodes);
  } catch (e) {
    console.error('Erreur:', e);
    process.exit(10);
  } finally {
    await prisma.$disconnect();
  }
}

main();

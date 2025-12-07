#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

(async () => {
  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { label: { contains: 'Orientation', mode: 'insensitive' } },
      select: {
        id: true,
        label: true,
        parentId: true,
        metadata: true
      },
      orderBy: { label: 'asc' }
    });

    for (const node of nodes) {
      console.log('\n', node.id, node.label, 'parent=', node.parentId);
      console.log('  metadata.subTab:', node.metadata?.subTab);
      console.log('  metadata.duplicatedFromRepeater:', node.metadata?.duplicatedFromRepeater);
      console.log('  metadata.autoCreatedDisplayNode:', node.metadata?.autoCreatedDisplayNode);
      console.log('  metadata.copiedFromNodeId:', node.metadata?.copiedFromNodeId);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
})();

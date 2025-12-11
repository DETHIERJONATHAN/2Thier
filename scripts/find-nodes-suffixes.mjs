import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function find() {
  const nodesDouble = await prisma.treeBranchLeafNode.findMany({
    where: { id: { contains: '-1-1' } },
    select: { id: true, label: true, metadata: true, parentId: true }
  });
  console.log('Nodes with id containing -1-1:', nodesDouble.length);
  console.log(nodesDouble.slice(0, 20));

  const nodesSingle = await prisma.treeBranchLeafNode.findMany({
    where: { id: { contains: '-1' } },
    select: { id: true, label: true, metadata: true, parentId: true },
    take: 200
  });
  console.log('Nodes with id containing -1:', nodesSingle.length);
  console.log(nodesSingle.slice(0, 20));

  // Variables referencing display nodes
  const vars = await prisma.treeBranchLeafNodeVariable.findMany({
    where: { nodeId: { contains: '-1-1' } },
    select: { id: true, nodeId: true, exposedKey: true }
  });
  console.log('Variables with nodeId containing -1-1', vars.length);
  console.log(vars.slice(0, 10));

  await prisma.$disconnect();
}

find().catch(e => { console.error(e); process.exit(1); });
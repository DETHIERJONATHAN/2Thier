import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function find() {
  // Variables with -1-1
  const varDouble = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      id: { contains: '-1-1' }
    },
    select: { id: true, nodeId: true, exposedKey: true }
  });
  console.log('Variables id with -1-1:', varDouble.length);
  console.log(varDouble.slice(0, 50));

  const varSingle = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      id: { contains: '-1' }
    },
    select: { id: true, nodeId: true, exposedKey: true },
    take: 200
  });
  console.log('Variables id with -1:', varSingle.length);
  
  // Variables whose nodeId contains -1-1
  const varByNode = await prisma.treeBranchLeafNodeVariable.findMany({
    where: { nodeId: { contains: '-1-1' } },
    select: { id: true, nodeId: true }
  });
  console.log('Variables with owner nodeId -1-1:', varByNode.length);
  console.log(varByNode.slice(0, 50));

  // Display nodes with metadata.fromVariableId includes -1-1 (we saw earlier)
  const disp = await prisma.treeBranchLeafNode.findMany({
    where: { metadata: { path: ['fromVariableId'], contains: '-1-1' } },
    select: { id: true, label: true, parentId: true, metadata: true }
  });
  console.log('Display nodes metadata fromVariableId containing -1-1:', disp.length);
  console.log(disp.slice(0, 20));

  await prisma.$disconnect();
}

find().catch(e => { console.error(e); process.exit(1); });
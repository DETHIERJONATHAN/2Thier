import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function list() {
  const nodeId = '6817ee20-5782-4b03-a7b1-0687cc5b4d58'; // Rampant toiture
  const vars = await prisma.treeBranchLeafNodeVariable.findMany({ where: { nodeId }, select: { id: true, displayName: true, sourceRef: true } });
  console.log(`Variables for ${nodeId}: ${vars.length}`);
  console.log(vars);

  const orientationVars = await prisma.treeBranchLeafNodeVariable.findMany({ where: { nodeId: '440d696a-34cf-418f-8f56-d61015f66d91' }, select: { id: true, displayName: true, sourceRef: true } });
  console.log(`Variables for orientation: ${orientationVars.length}`);
  console.log(orientationVars);

  await prisma.$disconnect();
}

list().catch(e => { console.error(e); process.exit(1); });
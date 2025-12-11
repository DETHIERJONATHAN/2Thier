import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function find() {
  const prefix = '88e42f4e-3468-4be6-9faf-7b74647f1fbd';
  const vars = await prisma.treeBranchLeafNodeVariable.findMany({ where: { id: { startsWith: prefix } }, select: { id: true, nodeId: true, createdAt: true } });
  console.log(`Vars starting with ${prefix}: ${vars.length}`);
  console.log(vars);

  await prisma.$disconnect();
}

find().catch(e => { console.error(e); process.exit(1); });
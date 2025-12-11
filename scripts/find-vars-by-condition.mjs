import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const [condId] = process.argv.slice(2);
if (!condId) { console.error('usage: node scripts/find-vars-by-condition.mjs <conditionId>'); process.exit(1); }
const vars = await prisma.treeBranchLeafNodeVariable.findMany({
  where: { sourceRef: { contains: condId } },
  select: { id: true, nodeId: true, sourceRef: true }
});
console.log(vars);
await prisma.$disconnect();

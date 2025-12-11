import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function find() {
  const copies = await prisma.treeBranchLeafNode.findMany({
    where: { metadata: { path: ['duplicatedFromRepeater'], equals: true } },
    select: { id: true, label: true, repeater_templateNodeIds: true, metadata: true }
  });
  console.log('Copies with duplicatedFromRepeater true:', copies.length);
  const bad = copies.filter(c => c.repeater_templateNodeIds);
  console.log('Among copies, those that still have repeater_templateNodeIds:', bad.length);
  console.log(bad.slice(0, 20));

  await prisma.$disconnect();
}

find().catch(e => { console.error(e); process.exit(1); });
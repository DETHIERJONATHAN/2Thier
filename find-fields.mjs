import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const nodes = await prisma.treeBranchLeafNode.findMany({
  where: {
    OR: [
      { label: { contains: 'combien', mode: 'insensitive' } },
      { label: { contains: 'pent', mode: 'insensitive' } },
      { label: { contains: 'mur', mode: 'insensitive' } }
    ]
  },
  select: {
    id: true,
    label: true,
    fieldType: true,
    number_min: true,
    number_max: true,
    defaultValue: true,
    number_defaultValue: true,
    repeater_countSourceNodeId: true
  },
  take: 20
});

console.log(JSON.stringify(nodes, null, 2));
await prisma.$disconnect();

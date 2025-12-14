import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getFieldNames() {
  const templateNodeIds = [
    "ad6fc72b-1757-4cc9-9d79-215cabf610e6",
    "962677c1-224e-4f1a-9837-88cbc2be2aad",
    "b92c3d0b-cd41-4689-9c72-3660a0ad8fa3",
    "f81b2ace-9f6c-45d4-82a7-a8e4bf842e45",
    "7d3dc335-ab7e-43e2-bbf1-395981a7938a",
    "ea10e9f4-9002-4923-8417-f1b4e3a1bdc7",
    "440d696a-34cf-418f-8f56-d61015f66d91",
    "6817ee20-5782-4b03-a7b1-0687cc5b4d58"
  ];

  const fields = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: templateNodeIds } },
    select: { id: true, label: true }
  });

  console.log('Champs du repeater:\n');
  fields.forEach((f, i) => {
    console.log(`${i + 1}. ${f.label}`);
  });

  await prisma.$disconnect();
}

getFieldNames();

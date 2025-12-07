const { PrismaClient } = require('@prisma/client');

(async () => {
  const prisma = new PrismaClient();
  try {
    const ids = [
      'adbd88c5-e8c3-4faa-a7e2-1b0d6e9985dd',
      'adf12dbb-076d-4e69-8500-efe648593e1e',
      '772692ef-c2b7-4630-b45c-12e8355547aa',
      '1203df47-e87e-42fd-b178-31afd89b9c83',
      'a2538f3a-0f05-434e-b5bd-9474944fc939',
      'a556b552-1869-4cfb-a64d-1ac1b6d8278c',
      'adbf2827-d5d7-4ef1-9b38-67f76e9129a6',
      '9c9f42b2-e0df-4726-8a81-997c0dee71bc'
    ];
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: ids } },
      select: { id: true, label: true, type: true, parentId: true }
    });
    console.log(nodes);
  } finally {
    await prisma.$disconnect();
  }
})();

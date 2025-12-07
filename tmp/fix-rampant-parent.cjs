const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TARGET_NODE_ID = '9c9f42b2-e0df-4726-8a81-997c0dee71bc-1';
const NEW_PARENT_ID = 'dd3a4c6b-26b8-40b9-aa9a-67b1e5a01e5b-1';

(async () => {
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id: TARGET_NODE_ID },
    select: { id: true, label: true, parentId: true }
  });

  if (!node) {
    console.log('❌ Rampant toiture-1 introuvable');
    await prisma.$disconnect();
    return;
  }

  console.log('Avant:', node);

  if (node.parentId === NEW_PARENT_ID) {
    console.log('✅ Parent déjà correct, aucune action.');
    await prisma.$disconnect();
    return;
  }

  await prisma.treeBranchLeafNode.update({
    where: { id: TARGET_NODE_ID },
    data: { parentId: NEW_PARENT_ID }
  });

  const updated = await prisma.treeBranchLeafNode.findUnique({
    where: { id: TARGET_NODE_ID },
    select: { id: true, label: true, parentId: true }
  });

  console.log('Après:', updated);

  await prisma.$disconnect();
})();

/** Inspect table meta for orientation/inclinaison matrix */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: 'aa6bcc57-2d05-48a6-aaa8-f2efd78b1114' },
      select: { id: true, name: true, meta: true }
    });
    console.dir(table, { depth: null });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

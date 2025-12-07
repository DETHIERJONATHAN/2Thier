const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const id = process.argv[2];
  const node = await prisma.treeBranchLeafNode.findUnique({
    where: { id },
    select: { id: true, label: true, parentId: true }
  });
  console.log(node);
}

main()
  .catch(err => console.error(err))
  .finally(() => prisma.$disconnect());

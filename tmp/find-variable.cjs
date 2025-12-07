const { PrismaClient } = require('@prisma/client');

const id = process.argv[2];

if (!id) {
  console.error('Usage: node tmp/find-variable.cjs <variableId>');
  process.exit(1);
}

(async () => {
  const prisma = new PrismaClient();
  try {
    const variable = await prisma.treeBranchLeafNodeVariable.findUnique({ where: { id } });
    console.log(variable);
  } finally {
    await prisma.$disconnect();
  }
})();

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findVar440d() {
  console.log('🔍 Recherche var_440d...\n');

  const vars = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      OR: [
        { exposedKey: { startsWith: 'var_440d' } },
        { displayName: { contains: 'Orientation - inclinaison' } }
      ]
    }
  });

  console.log(`📊 Trouvé ${vars.length} variable(s):\n`);
  
  for (const v of vars) {
    console.log(`ID: ${v.id}`);
    console.log(`nodeId: ${v.nodeId}`);
    console.log(`exposedKey: ${v.exposedKey}`);
    console.log(`displayName: ${v.displayName}`);
    console.log('---');
  }

  await prisma.$disconnect();
}

findVar440d().catch(console.error);

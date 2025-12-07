import { prisma } from './src/prisma-client.js';

async function main() {
  console.log('🔍 INSPECTION: Variables contenant "Lookup"\n');
  
  const lookupVars = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      displayName: {
        contains: 'Lookup',
      },
    },
    select: {
      id: true,
      displayName: true,
      parentNodeId: true,
      nodeId: true,
      hasData: true,
      hasTable: true,
      linkedTableIds: true,
    },
    take: 20,
  });
  
  console.log(`📊 Trouvé ${lookupVars.length} variable(s)\n`);
  lookupVars.forEach((v) => {
    console.log(`ID: ${v.id}`);
    console.log(`  displayName: ${v.displayName}`);
    console.log(`  parentNodeId: ${v.parentNodeId}`);
    console.log(`  nodeId: ${v.nodeId}`);
    console.log(`  hasData: ${v.hasData}`);
    console.log(`  hasTable: ${v.hasTable}`);
    console.log(`  linkedTableIds: ${v.linkedTableIds}`);
    console.log('');
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

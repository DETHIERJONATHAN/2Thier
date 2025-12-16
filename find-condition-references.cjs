const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const conditionId = '8eebf44e-f70b-4613-b13b-5f1e0a8b82cb';
  
  // Trouver TOUS les nœuds qui ont cette condition dans linkedConditionIds
  const nodesWithCondition = await prisma.treeBranchLeafNode.findMany({
    where: {
      linkedConditionIds: {
        has: conditionId
      }
    },
    select: {
      id: true,
      label: true,
      linkedConditionIds: true,
      condition_activeId: true
    }
  });
  
  console.log('=== NŒUDS QUI RÉFÉRENCENT LA CONDITION', conditionId, '===');
  nodesWithCondition.forEach(n => {
    console.log(`\nNode: ${n.id} (${n.label})`);
    console.log(`  linkedConditionIds: ${JSON.stringify(n.linkedConditionIds)}`);
    console.log(`  condition_activeId: ${n.condition_activeId}`);
  });
  
  // Maintenant chercher les nœuds qui ont la condition COPIÉE dans linkedConditionIds
  const copiedConditionId = '8eebf44e-f70b-4613-b13b-5f1e0a8b82cb-1';
  const nodesWithCopiedCondition = await prisma.treeBranchLeafNode.findMany({
    where: {
      linkedConditionIds: {
        has: copiedConditionId
      }
    },
    select: {
      id: true,
      label: true,
      linkedConditionIds: true,
      condition_activeId: true
    }
  });
  
  console.log('\n=== NŒUDS QUI RÉFÉRENCENT LA CONDITION COPIÉE', copiedConditionId, '===');
  nodesWithCopiedCondition.forEach(n => {
    console.log(`\nNode: ${n.id} (${n.label})`);
    console.log(`  linkedConditionIds: ${JSON.stringify(n.linkedConditionIds)}`);
    console.log(`  condition_activeId: ${n.condition_activeId}`);
  });
  
  await prisma.$disconnect();
}

main();

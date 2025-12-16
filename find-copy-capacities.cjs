const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const copyId = '3da47bc3-739e-4c83-98c3-813ecf77a740-1';
  const originalId = '3da47bc3-739e-4c83-98c3-813ecf77a740';
  
  // Trouver les conditions et formules de la copie
  const copyConditions = await prisma.treeBranchLeafNodeCondition.findMany({
    where: { nodeId: copyId },
    select: { id: true, name: true }
  });
  
  const copyFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
    where: { nodeId: copyId },
    select: { id: true, name: true }
  });
  
  console.log('=== CONDITIONS DE LA COPIE (-1) ===');
  console.log(copyConditions);
  
  console.log('\n=== FORMULES DE LA COPIE (-1) ===');
  console.log(copyFormulas);
  
  // Trouver les conditions et formules de l'original
  const originalConditions = await prisma.treeBranchLeafNodeCondition.findMany({
    where: { nodeId: originalId },
    select: { id: true, name: true }
  });
  
  const originalFormulas = await prisma.treeBranchLeafNodeFormula.findMany({
    where: { nodeId: originalId },
    select: { id: true, name: true }
  });
  
  console.log('\n=== CONDITIONS DE L\'ORIGINAL ===');
  console.log(originalConditions);
  
  console.log('\n=== FORMULES DE L\'ORIGINAL ===');
  console.log(originalFormulas);
  
  // Vérifier ce que la copie a comme activeIds
  const copyNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: copyId },
    select: { 
      id: true, 
      condition_activeId: true, 
      formula_activeId: true,
      hasCondition: true,
      hasFormula: true
    }
  });
  
  console.log('\n=== ÉTAT ACTUEL DE LA COPIE ===');
  console.log(copyNode);
  
  await prisma.$disconnect();
}

main();

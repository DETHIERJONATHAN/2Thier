const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  // Chercher la condition originale
  const original = await p.treeBranchLeafNodeCondition.findUnique({ 
    where: { id: '42de8d47-1300-49e0-bb00-f2dc3e4052d6' } 
  });
  console.log('Condition originale:', original?.name, '- nodeId:', original?.nodeId);
  
  // Chercher la condition copiée
  const copy = await p.treeBranchLeafNodeCondition.findUnique({ 
    where: { id: '42de8d47-1300-49e0-bb00-f2dc3e4052d6-1' } 
  });
  console.log('Condition copiée:', copy?.name, '- nodeId:', copy?.nodeId);
  
  // Le nodeId attendu pour la copie
  console.log('\nNodeId attendu pour la copie: 9c9f42b2-e0df-4726-8a81-997c0dee71bc-1');
  
  await p.$disconnect();
})();

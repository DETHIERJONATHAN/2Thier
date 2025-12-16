const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // La condition originale
  const conditionId = '8eebf44e-f70b-4613-b13b-5f1e0a8b82cb';
  
  // Vérifier à quel nœud appartient la condition originale
  const originalCondition = await prisma.treeBranchLeafNodeCondition.findUnique({
    where: { id: conditionId }
  });
  
  console.log('=== CONDITION ORIGINALE "Position" ===');
  console.log('ID:', originalCondition?.id);
  console.log('nodeId:', originalCondition?.nodeId);
  console.log('name:', originalCondition?.name);
  
  // Quel est ce nœud ?
  if (originalCondition?.nodeId) {
    const ownerNode = await prisma.treeBranchLeafNode.findUnique({
      where: { id: originalCondition.nodeId },
      select: { id: true, label: true }
    });
    console.log('Nœud propriétaire:', ownerNode?.label, `(${ownerNode?.id})`);
  }
  
  // Maintenant vérifions : est-ce que "Longueur" (6844ea47-...) a aussi cette condition ?
  const longueurNodeId = '6844ea47-db3d-4479-9e4e-ad207f7924e4';
  const longueurNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: longueurNodeId },
    select: { 
      id: true, 
      label: true, 
      hasCondition: true,
      condition_activeId: true,
      linkedConditionIds: true 
    }
  });
  
  console.log('\n=== NŒUD "Longueur" (original) ===');
  console.log(JSON.stringify(longueurNode, null, 2));
  
  // Vérifier les conditions liées à Longueur
  const longueurConditions = await prisma.treeBranchLeafNodeCondition.findMany({
    where: { nodeId: longueurNodeId }
  });
  
  console.log('\n=== CONDITIONS sur "Longueur" ===');
  console.log('Count:', longueurConditions.length);
  longueurConditions.forEach(c => console.log(`  - ${c.id}: ${c.name}`));
  
  // Vérifier si Longueur-1 a des conditions
  const longueur1Conditions = await prisma.treeBranchLeafNodeCondition.findMany({
    where: { nodeId: longueurNodeId + '-1' }
  });
  
  console.log('\n=== CONDITIONS sur "Longueur-1" ===');
  console.log('Count:', longueur1Conditions.length);
  longueur1Conditions.forEach(c => console.log(`  - ${c.id}: ${c.name} (nodeId=${c.nodeId})`));
  
  // Trouver TOUS les nœuds qui ont cette condition dans linkedConditionIds
  const nodesWithThisCondition = await prisma.treeBranchLeafNode.findMany({
    where: {
      linkedConditionIds: {
        has: conditionId
      }
    },
    select: { id: true, label: true, linkedConditionIds: true }
  });
  
  console.log('\n=== NŒUDS qui référencent la condition originale ===');
  nodesWithThisCondition.forEach(n => {
    console.log(`  - ${n.label} (${n.id})`);
    console.log(`    linkedConditionIds:`, n.linkedConditionIds);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

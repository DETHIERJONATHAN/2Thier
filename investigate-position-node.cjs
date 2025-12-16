const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Voir le nœud "Position" qui référence la condition
  const positionNode = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '249b682d-d50d-42fd-bdcf-f6a1139792d1' },
    select: {
      id: true,
      label: true,
      parentId: true,
      hasCondition: true,
      condition_activeId: true,
      linkedConditionIds: true,
      metadata: true
    }
  });
  
  console.log('=== NŒUD "Position" ===');
  console.log(JSON.stringify(positionNode, null, 2));
  
  // Voir son parent
  if (positionNode?.parentId) {
    const parent = await prisma.treeBranchLeafNode.findUnique({
      where: { id: positionNode.parentId },
      select: { id: true, label: true }
    });
    console.log('\nParent:', parent?.label, `(${parent?.id})`);
  }
  
  // Trouver d'où vient cette condition - chercher dans les métadonnées de la condition
  const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
    where: { id: '8eebf44e-f70b-4613-b13b-5f1e0a8b82cb-1' }
  });
  
  console.log('\n=== CONDITION Position-1 ===');
  console.log('nodeId:', condition?.nodeId);
  console.log('Créée le:', condition?.createdAt);
  
  // Voir le nœud Longueur-1
  const longueur1 = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '6844ea47-db3d-4479-9e4e-ad207f7924e4-1' },
    select: {
      id: true,
      label: true,
      hasCondition: true,
      condition_activeId: true,
      linkedConditionIds: true,
      metadata: true
    }
  });
  
  console.log('\n=== NŒUD "Longueur-1" ===');
  console.log(JSON.stringify(longueur1, null, 2));
  
  // Le fromVariableId de Longueur-1
  const varId = longueur1?.metadata?.fromVariableId;
  if (varId) {
    const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
      where: { id: varId },
      select: { id: true, displayName: true, nodeId: true }
    });
    console.log('\nVariable source:', variable);
    
    if (variable?.nodeId) {
      const varOwner = await prisma.treeBranchLeafNode.findUnique({
        where: { id: variable.nodeId },
        select: { id: true, label: true, hasCondition: true }
      });
      console.log('Nœud propriétaire de la variable:', varOwner);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

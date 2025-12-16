const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 1. Voir tous les nœuds qui ont linkedConditionIds contenant la condition Position
  const nodesWithCondition = await prisma.treeBranchLeafNode.findMany({
    where: {
      linkedConditionIds: {
        hasSome: ['8eebf44e-f70b-4613-b13b-5f1e0a8b82cb', '8eebf44e-f70b-4613-b13b-5f1e0a8b82cb-1']
      }
    },
    select: {
      id: true,
      label: true,
      hasCondition: true,
      condition_activeId: true,
      linkedConditionIds: true,
      metadata: true
    }
  });
  
  console.log('=== NŒUDS qui ont linkedConditionIds avec la condition Position ===');
  for (const n of nodesWithCondition) {
    console.log(`\n${n.label} (${n.id}):`);
    console.log(`  hasCondition: ${n.hasCondition}`);
    console.log(`  condition_activeId: ${n.condition_activeId}`);
    console.log(`  linkedConditionIds: ${JSON.stringify(n.linkedConditionIds)}`);
    console.log(`  repeater: ${n.metadata?.repeater ? 'OUI' : 'non'}`);
  }
  
  // 2. Voir LA condition originale et ses références
  const conditionOrig = await prisma.treeBranchLeafNodeCondition.findUnique({
    where: { id: '8eebf44e-f70b-4613-b13b-5f1e0a8b82cb' }
  });
  
  console.log('\n\n=== CONDITION ORIGINALE "Position" ===');
  console.log(`nodeId: ${conditionOrig?.nodeId}`);
  
  // Trouver le nœud propriétaire
  if (conditionOrig?.nodeId) {
    const owner = await prisma.treeBranchLeafNode.findUnique({
      where: { id: conditionOrig.nodeId },
      select: { id: true, label: true }
    });
    console.log(`Propriétaire: ${owner?.label} (${owner?.id})`);
  }
  
  // 3. Voir la condition Position-1 et ses références
  const condition1 = await prisma.treeBranchLeafNodeCondition.findUnique({
    where: { id: '8eebf44e-f70b-4613-b13b-5f1e0a8b82cb-1' }
  });
  
  console.log('\n\n=== CONDITION "Position-1" ===');
  console.log(`nodeId: ${condition1?.nodeId}`);
  
  if (condition1?.nodeId) {
    const owner1 = await prisma.treeBranchLeafNode.findUnique({
      where: { id: condition1.nodeId },
      select: { id: true, label: true }
    });
    console.log(`Propriétaire actuel: ${owner1?.label} (${owner1?.id})`);
    console.log(`\n❌ PROBLÈME: La condition Position-1 devrait appartenir à Panneaux max-1`);
    console.log(`   mais elle appartient à ${owner1?.label}`);
  }
  
  // 4. QUESTION CRITIQUE: Est-ce que "Panneaux max-1" existe et quel est son état ?
  const pannMax1 = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3da47bc3-739e-4c83-98c3-813ecf77a740-1' },
    select: {
      id: true,
      label: true,
      hasCondition: true,
      condition_activeId: true,
      linkedConditionIds: true
    }
  });
  
  console.log('\n\n=== NŒUD "Panneaux max-1" (la copie) ===');
  if (pannMax1) {
    console.log(JSON.stringify(pannMax1, null, 2));
  } else {
    console.log('INTROUVABLE !');
  }
  
  // 5. QUESTION: Quelle est la relation entre la condition Position et Panneaux max?
  // Regarder le conditionSet pour voir les références
  console.log('\n\n=== ANALYSE du conditionSet de Position ===');
  if (conditionOrig?.conditionSet) {
    const str = JSON.stringify(conditionOrig.conditionSet);
    console.log(`Références @value trouvées:`);
    const matches = str.match(/@value\.[a-f0-9-]+/gi) || [];
    for (const m of matches) {
      const nodeId = m.replace('@value.', '');
      const node = await prisma.treeBranchLeafNode.findUnique({
        where: { id: nodeId },
        select: { label: true }
      });
      console.log(`  ${m} → ${node?.label || 'INCONNU'}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

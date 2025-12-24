import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('=== DIAGNOSTIC LONGUEUR-1 APRÈS REPEAT ===\n');

  // Chercher le nœud Longueur-1 créé récemment
  const longueur1Nodes = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: 'Longueur-1' },
        { id: { endsWith: '-1', contains: 'longueur' } }
      ]
    },
    select: {
      id: true,
      label: true,
      type: true,
      hasFormula: true,
      hasCondition: true,
      hasTable: true,
      hasData: true,
      formula_activeId: true,
      condition_activeId: true,
      linkedFormulaIds: true,
      linkedConditionIds: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });

  console.log(`Trouvé ${longueur1Nodes.length} nœuds "Longueur-1":\n`);

  for (const node of longueur1Nodes) {
    console.log(`📦 Node: ${node.id}`);
    console.log(`   Label: ${node.label}`);
    console.log(`   Type: ${node.type}`);
    console.log(`   ⚠️ hasFormula: ${node.hasFormula}`);
    console.log(`   hasCondition: ${node.hasCondition}`);
    console.log(`   hasTable: ${node.hasTable}`);
    console.log(`   hasData: ${node.hasData}`);
    console.log(`   ⚠️ formula_activeId: ${node.formula_activeId}`);
    console.log(`   condition_activeId: ${node.condition_activeId}`);
    console.log(`   ⚠️ linkedFormulaIds: ${JSON.stringify(node.linkedFormulaIds)}`);
    console.log(`   linkedConditionIds: ${JSON.stringify(node.linkedConditionIds)}`);
    console.log(`   updatedAt: ${node.updatedAt}`);
    
    // Vérifier les variables associées
    const vars = await prisma.treeBranchLeafNodeVariable.findMany({
      where: { nodeId: node.id },
      select: { id: true, sourceRef: true, sourceType: true, displayName: true }
    });
    
    if (vars.length > 0) {
      console.log(`   📊 Variables (${vars.length}):`);
      for (const v of vars) {
        console.log(`      - ${v.id}: sourceRef=${v.sourceRef}, sourceType=${v.sourceType}`);
      }
    }
    console.log('');
  }

  // Chercher aussi par ID pattern
  const allSuffixed = await prisma.treeBranchLeafNode.findMany({
    where: {
      id: { endsWith: '-1' },
      label: { contains: 'Longueur' }
    },
    select: {
      id: true,
      label: true,
      hasFormula: true,
      formula_activeId: true,
      linkedFormulaIds: true,
      updatedAt: true
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  });

  console.log(`\n=== TOUS LES NŒUDS SUFFIXÉS -1 AVEC "Longueur" (${allSuffixed.length}) ===\n`);
  
  for (const node of allSuffixed) {
    const hasIssue = node.formula_activeId || (node.linkedFormulaIds && node.linkedFormulaIds.length > 0);
    const marker = hasIssue && !node.hasFormula ? '❌ PROBLÈME' : '✅ OK';
    console.log(`${marker} ${node.id}`);
    console.log(`   Label: ${node.label}`);
    console.log(`   hasFormula: ${node.hasFormula}`);
    console.log(`   formula_activeId: ${node.formula_activeId}`);
    console.log(`   linkedFormulaIds: ${JSON.stringify(node.linkedFormulaIds)}`);
    console.log('');
  }

  await prisma.$disconnect();
}

diagnose().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Original Panneaux max
  const original = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3da47bc3-739e-4c83-98c3-813ecf77a740' },
    select: {
      id: true,
      label: true,
      calculatedValue: true,
      formula_instances: true,
      formula_activeId: true,
      condition_instances: true,
      condition_activeId: true,
      hasFormula: true,
      hasCondition: true,
      linkedFormulaIds: true,
      linkedConditionIds: true
    }
  });

  console.log('=== ORIGINAL PANNEAUX MAX ===');
  console.log('ID:', original.id);
  console.log('hasFormula:', original.hasFormula);
  console.log('hasCondition:', original.hasCondition);
  console.log('formula_instances:', JSON.stringify(original.formula_instances, null, 2));
  console.log('formula_activeId:', original.formula_activeId);
  console.log('condition_instances:', JSON.stringify(original.condition_instances, null, 2));
  console.log('condition_activeId:', original.condition_activeId);
  console.log('linkedFormulaIds:', original.linkedFormulaIds);
  console.log('linkedConditionIds:', original.linkedConditionIds);
  console.log('calculatedValue:', original.calculatedValue);

  // Copie -1
  const copy = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3da47bc3-739e-4c83-98c3-813ecf77a740-1' },
    select: {
      id: true,
      label: true,
      calculatedValue: true,
      formula_instances: true,
      formula_activeId: true,
      condition_instances: true,
      condition_activeId: true,
      hasFormula: true,
      hasCondition: true,
      linkedFormulaIds: true,
      linkedConditionIds: true
    }
  });

  console.log('\n=== COPIE PANNEAUX MAX-1 ===');
  if (copy) {
    console.log('ID:', copy.id);
    console.log('hasFormula:', copy.hasFormula);
    console.log('hasCondition:', copy.hasCondition);
    console.log('formula_instances:', JSON.stringify(copy.formula_instances, null, 2));
    console.log('formula_activeId:', copy.formula_activeId);
    console.log('condition_instances:', JSON.stringify(copy.condition_instances, null, 2));
    console.log('condition_activeId:', copy.condition_activeId);
    console.log('linkedFormulaIds:', copy.linkedFormulaIds);
    console.log('linkedConditionIds:', copy.linkedConditionIds);
    console.log('calculatedValue:', copy.calculatedValue);
  } else {
    console.log('COPIE NON TROUVÉE');
  }

  await prisma.$disconnect();
}

main();

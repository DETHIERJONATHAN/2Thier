/**
 * 🔍 Chercher le champ Position et ses dépendances
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyze() {
  console.log('='.repeat(70));
  console.log('🔍 Recherche du champ Position');
  console.log('='.repeat(70));

  // 1. Trouver le champ Position
  const positionFields = await prisma.treeBranchLeafNode.findMany({
    where: {
      OR: [
        { label: { contains: 'Position', mode: 'insensitive' } },
        { label: { contains: 'Portrait', mode: 'insensitive' } },
        { label: { contains: 'Paysage', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      label: true,
      type: true,
      select_options: true,
      parentId: true,
      treeId: true
    }
  });
  
  console.log('\n📦 Champs "Position" trouvés:', positionFields.length);
  positionFields.forEach(f => {
    console.log(`   - ${f.label} (${f.id}) type=${f.type} tree=${f.treeId}`);
    if (f.select_options) {
      console.log(`     Options:`, JSON.stringify(f.select_options).substring(0, 200));
    }
  });

  // 2. Trouver les variables qui référencent ces champs
  for (const field of positionFields) {
    const variables = await prisma.treeBranchLeafNodeVariable.findMany({
      where: {
        OR: [
          { sourceRef: { contains: field.id } },
          { nodeId: field.id }
        ]
      },
      select: {
        id: true,
        nodeId: true,
        displayName: true,
        sourceRef: true,
        sourceType: true
      }
    });
    
    if (variables.length > 0) {
      console.log(`\n📊 Variables liées à "${field.label}":`);
      variables.forEach(v => {
        console.log(`   - ${v.displayName} sourceRef=${v.sourceRef} type=${v.sourceType}`);
      });
    }
  }

  // 3. Chercher les formules qui utilisent Portrait/Paysage
  const formulas = await prisma.treeBranchLeafNodeFormula.findMany({
    where: {
      OR: [
        { name: { contains: 'Portrait', mode: 'insensitive' } },
        { name: { contains: 'Paysage', mode: 'insensitive' } },
        { name: { contains: 'Position', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      nodeId: true,
      tokens: true
    }
  });
  
  console.log('\n📐 Formules Portrait/Paysage:', formulas.length);
  formulas.forEach(f => {
    console.log(`   - ${f.name} (nodeId: ${f.nodeId})`);
    console.log(`     tokens:`, JSON.stringify(f.tokens).substring(0, 300));
  });

  // 4. Chercher les conditions qui utilisent Position/Portrait/Paysage
  const conditions = await prisma.treeBranchLeafNodeCondition.findMany({
    where: {
      OR: [
        { name: { contains: 'Portrait', mode: 'insensitive' } },
        { name: { contains: 'Paysage', mode: 'insensitive' } },
        { name: { contains: 'Position', mode: 'insensitive' } }
      ]
    },
    select: {
      id: true,
      name: true,
      nodeId: true,
      conditionSet: true
    }
  });
  
  console.log('\n⚖️ Conditions Position/Portrait/Paysage:', conditions.length);
  conditions.forEach(c => {
    console.log(`   - ${c.name} (conditionId: ${c.id}, nodeId: ${c.nodeId})`);
    if (c.conditionSet) {
      console.log(`     conditionSet:`, JSON.stringify(c.conditionSet).substring(0, 500));
    }
  });

  // 5. Chercher le champ "Panneaux max" et ses conditions/formules
  const panneauxMax = await prisma.treeBranchLeafNode.findMany({
    where: {
      label: { contains: 'Panneaux max', mode: 'insensitive' }
    },
    select: {
      id: true,
      label: true,
      type: true,
      condition_activeId: true,
      formula_activeId: true,
      linkedConditionIds: true,
      linkedFormulaIds: true,
      treeId: true
    }
  });

  console.log('\n📊 Champs "Panneaux max" trouvés:');
  for (const pm of panneauxMax) {
    console.log(`   - ${pm.label} (${pm.id}) type=${pm.type}`);
    console.log(`     condition_activeId: ${pm.condition_activeId}`);
    console.log(`     formula_activeId: ${pm.formula_activeId}`);
    console.log(`     linkedConditionIds:`, pm.linkedConditionIds);
    console.log(`     linkedFormulaIds:`, pm.linkedFormulaIds);
    
    // Si il a une condition active, la chercher
    if (pm.condition_activeId) {
      const cond = await prisma.treeBranchLeafNodeCondition.findUnique({
        where: { id: pm.condition_activeId }
      });
      if (cond) {
        console.log(`\n     🔍 Condition active "${cond.name}":`);
        console.log(`        conditionSet:`, JSON.stringify(cond.conditionSet).substring(0, 600));
      }
    }
    
    // Si il a une formule active, la chercher
    if (pm.formula_activeId) {
      const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
        where: { id: pm.formula_activeId }
      });
      if (formula) {
        console.log(`\n     🔍 Formule active "${formula.name}":`);
        console.log(`        tokens:`, JSON.stringify(formula.tokens).substring(0, 600));
      }
    }
  }

  console.log('\n' + '='.repeat(70));
}

analyze()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
  console.log('\n=== COMPARAISON DE TOUS LES CHAMPS TOTAL ===\n');
  
  const totals = await p.treeBranchLeafNode.findMany({
    where: { id: { endsWith: '-sum-total' } },
    select: {
      id: true,
      label: true,
      formula_tokens: true,
      formula_activeId: true,
      formula_instances: true,
      calculatedValue: true,
      hasFormula: true
    }
  });
  
  for (const t of totals) {
    console.log(`📊 ${t.label}`);
    console.log(`   ID: ${t.id}`);
    console.log(`   hasFormula: ${t.hasFormula}`);
    console.log(`   formula_activeId: ${t.formula_activeId}`);
    console.log(`   formula_tokens: ${JSON.stringify(t.formula_tokens)}`);
    console.log(`   calculatedValue: ${t.calculatedValue}`);
    
    // Vérifier si formula_instances contient la bonne formule
    const instances = t.formula_instances || {};
    const keys = Object.keys(instances);
    console.log(`   formula_instances keys: ${JSON.stringify(keys)}`);
    if (t.formula_activeId && instances[t.formula_activeId]) {
      console.log(`   ✅ formula_activeId trouvé dans instances`);
    } else if (t.formula_activeId) {
      console.log(`   ❌ formula_activeId "${t.formula_activeId}" NON TROUVÉ dans instances!`);
    }
    console.log('');
  }
  
  await p.$disconnect();
})();

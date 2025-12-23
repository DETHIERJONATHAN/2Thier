const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const treeId = 'cmf1mwoz10005gooked1j6orn';
  
  // Récupérer tous les nœuds avec leur calculatedValue
  console.log('=== NOEUDS AVEC CALCULATED VALUE ===\n');
  
  const nodes = await prisma.treeBranchLeafNode.findMany({
    where: { treeId },
    select: {
      id: true,
      label: true,
      type: true,
      fieldType: true,
      calculatedValue: true,
      value: true,
      hasFormula: true,
      formula_tokens: true,
      data_exposedKey: true,
      data_unit: true
    },
    orderBy: { order: 'asc' }
  });
  
  // Filtrer ceux qui ont une calculatedValue ou hasFormula
  const withCalc = nodes.filter(n => n.calculatedValue || n.hasFormula);
  
  console.log(`Total nœuds: ${nodes.length}`);
  console.log(`Avec calculatedValue ou formule: ${withCalc.length}\n`);
  
  console.log('--- NOEUDS AVEC CALCULATED VALUE ---');
  withCalc.forEach(n => {
    console.log(`\n📊 ${n.label}`);
    console.log(`   ID: ${n.id}`);
    console.log(`   Type: ${n.type} / ${n.fieldType || '-'}`);
    console.log(`   calculatedValue: ${n.calculatedValue}`);
    console.log(`   hasFormula: ${n.hasFormula}`);
    console.log(`   exposedKey: ${n.data_exposedKey || '-'}`);
    console.log(`   unit: ${n.data_unit || '-'}`);
    if (n.formula_tokens) {
      console.log(`   formula_tokens: ${JSON.stringify(n.formula_tokens).substring(0, 100)}...`);
    }
  });
  
  // Afficher aussi les repeaters
  console.log('\n\n=== REPEATERS ===');
  const repeaters = nodes.filter(n => n.type === 'leaf_repeater');
  repeaters.forEach(r => {
    console.log(`\n🔄 ${r.label} (${r.id})`);
  });
  
  // Voir les enfants des repeaters (branches/fields liés)
  console.log('\n\n=== STRUCTURE REPEATER TOIT ===');
  const toitId = 'd3afb112-d18a-47eb-a89f-6e3e1a65db7a';
  
  // Chercher les nœuds qui pourraient être des instances du repeater
  const toitRelated = nodes.filter(n => 
    n.id.includes('d3afb112') || 
    n.label.toLowerCase().includes('toit') ||
    n.label.toLowerCase().includes('versant')
  );
  console.log('Nœuds liés au Toit:');
  toitRelated.forEach(n => {
    console.log(`  ${n.type}: ${n.label} (${n.id.substring(0, 20)}...)`);
  });
  
  console.log('\n\n=== STRUCTURE REPEATER MUR ===');
  const murRelated = nodes.filter(n => 
    n.id.includes('f40b31f0') || 
    n.label.toLowerCase().includes('mur')
  );
  console.log('Nœuds liés au Mur:');
  murRelated.forEach(n => {
    console.log(`  ${n.type}: ${n.label} (${n.id.substring(0, 20)}...)`);
    if (n.calculatedValue) console.log(`    → calculatedValue: ${n.calculatedValue}`);
  });
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

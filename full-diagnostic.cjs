const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== DIAGNOSTIC COMPLET APRÈS FIXES ===\n');

  // 1. Panneaux max-1
  const pm1 = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3da47bc3-739e-4c83-98c3-813ecf77a740-1' },
    select: {
      label: true,
      calculatedValue: true,
      hasFormula: true,
      formula_activeId: true,
      hasCondition: true,
      condition_activeId: true
    }
  });
  console.log('PANNEAUX MAX-1:', pm1);

  // 2. Vérifier la formule active
  if (pm1?.formula_activeId) {
    const formula = await prisma.treeBranchLeafNodeFormula.findUnique({
      where: { id: pm1.formula_activeId }
    });
    console.log('\nFORMULE ACTIVE:', formula?.name);
    console.log('Tokens:', formula?.tokens);
  }

  // 3. Vérifier les sources
  console.log('\n=== SOURCES ===');
  
  const sources = [
    { id: '6817ee20-5782-4b03-a7b1-0687cc5b4d58-1', name: 'Rampant toiture-1' },
    { id: 'aaf69b1e-75d2-4a55-8bf2-231ca96e459a-1', name: 'Longueur toiture-1' },
  ];

  for (const s of sources) {
    const node = await prisma.treeBranchLeafNode.findUnique({
      where: { id: s.id },
      select: { label: true, calculatedValue: true, value: true }
    });
    console.log(`${s.name}: calculatedValue=${node?.calculatedValue}, value=${node?.value}`);
  }

  // 4. Vérifier les tables
  console.log('\n=== TABLES ===');
  
  const tables = [
    { id: '5403f874-3d02-427a-854b-0cfad91c7906-1', name: 'Largeur panneau-1' },
    { id: '2f58d585-19ed-4834-add9-ce065eb1ab4c-1', name: 'Longueur panneau-1' }
  ];

  for (const t of tables) {
    const table = await prisma.treeBranchLeafNodeTable.findUnique({
      where: { id: t.id },
      select: { 
        name: true, 
        nodeId: true,
        lookupKey: true,
        lookupColumn: true,
        tableRows: { select: { rowIndex: true, cells: true }, take: 2 }
      }
    });
    console.log(`\n${t.name}:`);
    console.log(`  nodeId: ${table?.nodeId}`);
    console.log(`  lookupKey: ${table?.lookupKey}`);
    console.log(`  lookupColumn: ${table?.lookupColumn}`);
    if (table?.tableRows?.[1]) {
      console.log(`  Row 1 (data):`, JSON.stringify(table.tableRows[1].cells).substring(0, 80));
    }
  }

  // 5. Simuler le calcul
  console.log('\n\n=== SIMULATION CALCUL ===');
  
  const rampant = 5.5;
  const longueur = 10;
  
  // Valeurs des tables (index 9 = Longueur, index 10 = Largeur selon les données)
  // D'après les données: 1.76 (longueur), 1.134 (largeur)
  const largeurPanneau = 1.134;
  const longueurPanneau = 1.76;
  
  const maxPaysage = Math.floor((rampant - 0.3) / largeurPanneau) * Math.floor((longueur - 0.3) / longueurPanneau);
  const maxPortrait = Math.floor((rampant - 0.3) / longueurPanneau) * Math.floor((longueur - 0.3) / largeurPanneau);
  
  console.log(`Rampant: ${rampant}`);
  console.log(`Longueur: ${longueur}`);
  console.log(`Largeur panneau: ${largeurPanneau}`);
  console.log(`Longueur panneau: ${longueurPanneau}`);
  console.log(`\nMAX paysage: ENT((${rampant}-0.3)/${largeurPanneau}) * ENT((${longueur}-0.3)/${longueurPanneau})`);
  console.log(`           = ENT(${(rampant-0.3)/largeurPanneau}) * ENT(${(longueur-0.3)/longueurPanneau})`);
  console.log(`           = ${Math.floor((rampant-0.3)/largeurPanneau)} * ${Math.floor((longueur-0.3)/longueurPanneau)}`);
  console.log(`           = ${maxPaysage}`);
  console.log(`\nMAX portrait: ${maxPortrait}`);

  // 6. Vérifier quelle formule DEVRAIT être active selon la condition
  console.log('\n\n=== CONDITION ===');
  const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
    where: { id: '8eebf44e-f70b-4613-b13b-5f1e0a8b82cb-1' }
  });
  
  if (condition) {
    const cs = condition.conditionSet;
    console.log('Condition:', condition.name);
    if (cs?.branches?.[0]) {
      const branch = cs.branches[0];
      console.log(`Si ${branch.when?.left?.ref} == ${branch.when?.right?.ref}`);
      console.log(`  → Formule: ${branch.actions?.[0]?.nodeIds}`);
    }
    console.log(`Sinon → Formule: ${cs?.fallback?.actions?.[0]?.nodeIds}`);
  }

  // Position-1 et Portrait-1
  const position1 = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '249b682d-d50d-42fd-bdcf-f6a1139792d1-1' },
    select: { value: true, calculatedValue: true }
  });
  const portrait1 = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3211d48d-4745-445d-b8fc-3e19e5dc4b8a-1' },
    select: { value: true, calculatedValue: true }
  });
  
  console.log(`\nPosition-1: value=${position1?.value}, calc=${position1?.calculatedValue}`);
  console.log(`Portrait-1: value=${portrait1?.value}, calc=${portrait1?.calculatedValue}`);
  console.log(`\n→ Position == Portrait ? ${position1?.value === portrait1?.value ? 'OUI' : 'NON'}`);
  console.log(`→ Formule active devrait être: ${position1?.value === portrait1?.value ? 'Max Portrait' : 'MAX paysage'}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

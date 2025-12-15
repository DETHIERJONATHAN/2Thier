/**
 * 🔍 Diagnostic complet du calcul "Panneaux max" avec la condition Position
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnose() {
  console.log('='.repeat(70));
  console.log('🔍 DIAGNOSTIC: Panneaux max avec condition Position');
  console.log('='.repeat(70));

  // 1. Récupérer le champ Panneaux max
  const panneauxMax = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3da47bc3-739e-4c83-98c3-813ecf77a740' },
    select: {
      id: true,
      label: true,
      calculatedValue: true,
      calculatedAt: true,
      condition_activeId: true,
      formula_activeId: true
    }
  });

  console.log('\n📊 Champ "Panneaux max":');
  console.log(`   ID: ${panneauxMax.id}`);
  console.log(`   calculatedValue actuelle: ${panneauxMax.calculatedValue}`);
  console.log(`   calculatedAt: ${panneauxMax.calculatedAt}`);
  console.log(`   condition_activeId: ${panneauxMax.condition_activeId}`);
  console.log(`   formula_activeId: ${panneauxMax.formula_activeId}`);

  // 2. Récupérer la condition "Position"
  const condition = await prisma.treeBranchLeafNodeCondition.findUnique({
    where: { id: '8eebf44e-f70b-4613-b13b-5f1e0a8b82cb' },
    select: {
      id: true,
      name: true,
      conditionSet: true
    }
  });

  console.log('\n⚖️ Condition "Position":');
  console.log(`   ID: ${condition.id}`);
  console.log(`   Nom: ${condition.name}`);
  
  const condSet = condition.conditionSet;
  const branch = condSet.branches?.[0];
  const when = branch?.when;
  
  console.log(`\n   📍 WHEN structure:`);
  console.log(`      op: ${when?.op}`);
  console.log(`      left.ref: ${when?.left?.ref}`);
  console.log(`      left.kind: ${when?.left?.kind}`);
  console.log(`      right.ref: ${when?.right?.ref}`);
  console.log(`      right.kind: ${when?.right?.kind}`);
  
  console.log(`\n   📍 Actions ALORS (si condition vraie):`);
  branch?.actions?.forEach(a => {
    console.log(`      type: ${a.type}, nodeIds: ${JSON.stringify(a.nodeIds)}`);
  });
  
  console.log(`\n   📍 Actions SINON (fallback):`);
  condSet.fallback?.actions?.forEach(a => {
    console.log(`      type: ${a.type}, nodeIds: ${JSON.stringify(a.nodeIds)}`);
  });

  // 3. Récupérer le champ Position et ses valeurs
  const positionFieldId = '249b682d-d50d-42fd-bdcf-f6a1139792d1';
  const positionField = await prisma.treeBranchLeafNode.findUnique({
    where: { id: positionFieldId },
    select: {
      id: true,
      label: true,
      select_options: true
    }
  });
  
  console.log('\n📋 Champ "Position":');
  console.log(`   ID: ${positionFieldId}`);
  console.log(`   Label: ${positionField?.label}`);
  console.log(`   select_options: ${JSON.stringify(positionField?.select_options)}`);

  // 4. Récupérer les options Portrait/Paysage
  const portraitOption = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '3211d48d-4745-445d-b8fc-3e19e5dc4b8a' },
    select: { id: true, label: true, type: true }
  });
  
  const paysageOption = await prisma.treeBranchLeafNode.findUnique({
    where: { id: '1b7326a7-74b8-4ad4-bbf2-c9cdef0712ed' },
    select: { id: true, label: true, type: true }
  });

  console.log('\n🎨 Options:');
  console.log(`   Portrait: ${portraitOption?.id} (${portraitOption?.label})`);
  console.log(`   Paysage: ${paysageOption?.id} (${paysageOption?.label})`);

  // 5. Récupérer les SubmissionData pour Position
  const submissionData = await prisma.treeBranchLeafSubmissionData.findMany({
    where: { nodeId: positionFieldId },
    select: {
      submissionId: true,
      value: true,
      lastResolved: true
    },
    take: 5,
    orderBy: { lastResolved: 'desc' }
  });

  console.log('\n💾 SubmissionData pour Position (5 dernières):');
  submissionData.forEach(sd => {
    console.log(`   submission: ${sd.submissionId.substring(0, 30)}...`);
    console.log(`   value: ${sd.value}`);
    console.log(`   lastResolved: ${sd.lastResolved}`);
    console.log('   ---');
  });

  // 6. Récupérer les formules Portrait et Paysage
  const formulaPortrait = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: '8a846e2c-b64d-42d8-91f7-1f74c6cb7114' },
    select: { id: true, name: true }
  });
  
  const formulaPaysage = await prisma.treeBranchLeafNodeFormula.findUnique({
    where: { id: '60c3283b-7587-4766-a81c-1c115dc279b6' },
    select: { id: true, name: true }
  });

  console.log('\n📐 Formules:');
  console.log(`   Portrait: ${formulaPortrait?.id} (${formulaPortrait?.name})`);
  console.log(`   Paysage: ${formulaPaysage?.id} (${formulaPaysage?.name})`);

  // 7. Test de la condition avec différentes valeurs
  console.log('\n🧪 TEST de la condition contains:');
  
  const leftValues = [
    '3211d48d-4745-445d-b8fc-3e19e5dc4b8a', // ID Portrait
    '1b7326a7-74b8-4ad4-bbf2-c9cdef0712ed', // ID Paysage
    'Portrait',
    'Paysage',
    null
  ];
  
  const rightValue = '3211d48d-4745-445d-b8fc-3e19e5dc4b8a'; // ID Portrait (depuis @select)
  
  console.log(`   RIGHT (ID Portrait): ${rightValue}`);
  
  leftValues.forEach(left => {
    if (left === null) {
      console.log(`   LEFT: null -> contains = false`);
    } else {
      const result = String(left).toLowerCase().includes(String(rightValue).toLowerCase());
      console.log(`   LEFT: "${left}" -> contains = ${result}`);
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('💡 ANALYSE:');
  console.log('   La condition compare @value.Position CONTAINS @select.Portrait');
  console.log('   - @select.Portrait retourne l\'ID de l\'option: 3211d48d-...');
  console.log('   - @value.Position devrait retourner l\'ID sélectionné');
  console.log('   - Pour que contains fonctionne, leftValue doit INCLURE rightValue');
  console.log('='.repeat(70));
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

async function analyzeState(label) {
  console.log(`\n${'='.repeat(100)}`);
  console.log(`📊 ANALYSIS: ${label}`);
  console.log(`${'='.repeat(100)}\n`);

  // Trouver le repeater
  const repeater = await prisma.treeBranchLeafNode.findFirst({
    where: { label: 'Toit' }
  });

  if (!repeater) {
    console.log('❌ Repeater "Toit" not found\n');
    return null;
  }

  console.log(`✅ Repeater: ${repeater.name} (${repeater.id})`);
  console.log(`   Templates (templateNodeIds): ${repeater.repeater_templateNodeIds?.length || 0}`);

  // Analyser les templates et leurs linkedVariableIds
  if (repeater.repeater_templateNodeIds && repeater.repeater_templateNodeIds.length > 0) {
    console.log(`\n🎯 TEMPLATES AND THEIR linkedVariableIds:`);
    
    const templates = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: repeater.repeater_templateNodeIds } },
      select: {
        id: true,
        name: true,
        linkedVariableIds: true
      }
    });

    for (const template of templates) {
      console.log(`\n   Template: ${template.name}`);
      console.log(`   ID: ${template.id}`);
      console.log(`   linkedVariableIds: ${JSON.stringify(template.linkedVariableIds)}`);

      // Vérifier si les variables existent
      if (template.linkedVariableIds && template.linkedVariableIds.length > 0) {
        for (const varId of template.linkedVariableIds) {
          const variable = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: varId },
            select: { id: true, name: true }
          });
          if (variable) {
            console.log(`      ✅ Variable EXISTS: ${variable.name} (${variable.id})`);
          } else {
            console.log(`      ❌ MISSING variable: ${varId}`);
          }
        }
      }
    }
  }

  // Compter les copies du repeater
  const copies = await prisma.treeBranchLeafNode.findMany({
    where: {
      parentId: repeater.id,
      NOT: { id: { in: repeater.repeater_templateNodeIds || [] } }
    },
    select: {
      id: true,
      name: true,
      children: {
        select: { id: true, name: true, linkedVariableIds: true }
      }
    }
  });

  console.log(`\n📦 COPIES OF REPEATER: ${copies.length}`);
  for (const copy of copies) {
    console.log(`   Copy: ${copy.name}`);
    console.log(`   └─ Children: ${copy.children.length}`);
    
    let displayNodeCount = 0;
    for (const child of copy.children) {
      if (child.linkedVariableIds && child.linkedVariableIds.length > 0) {
        displayNodeCount++;
        console.log(`      ✅ ${child.name}: ${child.linkedVariableIds.length} display variables`);
      }
    }
    console.log(`      Total display nodes: ${displayNodeCount}`);
  }

  // Count all variables (original + suffixed)
  const allNodeIds = [
    repeater.id,
    ...(repeater.repeater_templateNodeIds || []),
    ...copies.map(c => c.id),
    ...copies.flatMap(c => c.children.map(ch => ch.id))
  ];

  const variables = await prisma.treeBranchLeafNodeVariable.findMany({
    where: {
      OR: [
        { nodeId: { in: allNodeIds } },
        { sourceNodeId: { in: allNodeIds } }
      ]
    },
    select: { id: true, name: true, nodeId: true }
  });

  const originals = variables.filter(v => !/-\d+$/.test(v.id));
  const suffixed = variables.filter(v => /-\d+$/.test(v.id));

  console.log(`\n🔍 VARIABLE SUMMARY:`);
  console.log(`   Original variables (no suffix): ${originals.length}`);
  for (const v of originals) {
    console.log(`      ✅ ${v.name} (${v.id})`);
  }
  console.log(`   Suffixed variables (copies): ${suffixed.length}`);
  for (const v of suffixed) {
    console.log(`      🔄 ${v.name} (${v.id})`);
  }

  console.log(`\n${'='.repeat(100)}\n`);
  return { repeater, copies, originals, suffixed, templates };
}

async function main() {
  try {
    console.log('\n🔍 REPEATER DEGRADATION ANALYSIS');
    console.log('This will help us understand why 2nd delete->create fails\n');

    // Step 1: Initial state
    await analyzeState('INITIAL STATE');
    await question('Press ENTER after reviewing initial state > ');

    // Step 2: Create 1st time
    console.log('>>> NOW: Go to the CRM and CREATE the repeater (copy 1)');
    await question('Press ENTER when done > ');
    const state1 = await analyzeState('AFTER 1ST CREATE');
    await question('Press ENTER to continue > ');

    // Step 3: Delete 1st time
    console.log('>>> NOW: Go to the CRM and DELETE the repeater copy');
    await question('Press ENTER when done > ');
    const state2 = await analyzeState('AFTER 1ST DELETE');
    await question('Press ENTER to continue > ');

    // Step 4: Create 2nd time
    console.log('>>> NOW: Go to the CRM and CREATE the repeater again (copy 2)');
    await question('Press ENTER when done > ');
    const state3 = await analyzeState('AFTER 2ND CREATE');
    await question('Press ENTER to continue > ');

    // Step 5: Delete 2nd time
    console.log('>>> NOW: Go to the CRM and DELETE the repeater copy again');
    await question('Press ENTER when done > ');
    const state4 = await analyzeState('AFTER 2ND DELETE');
    await question('Press ENTER to continue > ');

    // Step 6: Create 3rd time
    console.log('>>> NOW: Go to the CRM and CREATE the repeater a 3rd time (copy 3)');
    await question('Press ENTER when done > ');
    const state5 = await analyzeState('AFTER 3RD CREATE');

    // COMPARISON
    console.log(`\n\n${'='.repeat(100)}`);
    console.log(`📈 COMPARISON: What changed?`);
    console.log(`${'='.repeat(100)}\n`);

    console.log(`After 1st CREATE: ${state1?.copies[0]?.children.filter(c => c.linkedVariableIds?.length > 0).length || 0} display nodes`);
    console.log(`After 2nd CREATE: ${state3?.copies[0]?.children.filter(c => c.linkedVariableIds?.length > 0).length || 0} display nodes`);
    console.log(`After 3rd CREATE: ${state5?.copies[0]?.children.filter(c => c.linkedVariableIds?.length > 0).length || 0} display nodes`);

    console.log(`\nOriginal variables:`);
    console.log(`  1st: ${state1?.originals.length || 0}`);
    console.log(`  2nd: ${state2?.originals.length || 0}`);
    console.log(`  3rd: ${state4?.originals.length || 0}`);
    console.log(`  4th: ${state5?.originals.length || 0}`);

    const templates = state1?.templates || [];
    if (templates.length > 0) {
      console.log(`\nTemplate linkedVariableIds changes:`);
      for (const template of templates) {
        console.log(`  ${template.name}:`);
        console.log(`    Initial: ${JSON.stringify(template.linkedVariableIds)}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();

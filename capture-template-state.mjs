#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function captureTemplateState(label) {
  const repeater = await prisma.treeBranchLeafNode.findFirst({
    where: { label: 'Toit' }
  });

  if (!repeater || !repeater.repeater_templateNodeIds) {
    console.log('❌ Repeater not found or no templates');
    return null;
  }

  const templates = await prisma.treeBranchLeafNode.findMany({
    where: { id: { in: repeater.repeater_templateNodeIds } },
    select: {
      id: true,
      name: true,
      linkedVariableIds: true,
      metadata: true,
      updatedAt: true
    }
  });

  console.log(`\n📋 ${label}`);
  console.log(`${'='.repeat(80)}`);

  for (const template of templates) {
    console.log(`\nTemplate: ${template.name}`);
    console.log(`  ID: ${template.id}`);
    console.log(`  linkedVariableIds: ${JSON.stringify(template.linkedVariableIds)}`);
    console.log(`  updatedAt: ${template.updatedAt}`);
  }

  return templates;
}

async function main() {
  try {
    // Initial
    const initial = await captureTemplateState('1️⃣  INITIAL TEMPLATES');
    
    console.log('\n\n>>> Go create a repeater copy');
    await new Promise(r => setTimeout(r, 5000));
    
    const after1stCreate = await captureTemplateState('2️⃣  AFTER 1ST CREATE');
    
    console.log('\n\n>>> Go delete the repeater copy');
    await new Promise(r => setTimeout(r, 5000));
    
    const after1stDelete = await captureTemplateState('3️⃣  AFTER 1ST DELETE');
    
    console.log('\n\n>>> Go create the repeater again');
    await new Promise(r => setTimeout(r, 5000));
    
    const after2ndCreate = await captureTemplateState('4️⃣  AFTER 2ND CREATE');
    
    // COMPARISON
    console.log(`\n\n${'='.repeat(80)}`);
    console.log('🔍 COMPARISON: Did template linkedVariableIds change?');
    console.log(`${'='.repeat(80)}\n`);

    if (initial && after1stDelete) {
      let anyChanged = false;
      for (let i = 0; i < initial.length; i++) {
        const before = JSON.stringify(initial[i].linkedVariableIds);
        const after = JSON.stringify(after1stDelete[i].linkedVariableIds);
        if (before !== after) {
          console.log(`❌ ${initial[i].name} linkedVariableIds CHANGED!`);
          console.log(`   Before: ${before}`);
          console.log(`   After: ${after}`);
          anyChanged = true;
        } else {
          console.log(`✅ ${initial[i].name} linkedVariableIds unchanged`);
        }
      }
      if (!anyChanged) {
        console.log(`\n✅ All template linkedVariableIds are INTACT after delete/create!`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

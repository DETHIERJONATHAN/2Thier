#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n🎯 VARIABLE DEGRADATION DIAGNOSIS\n');

    // Find the repeater
    const repeater = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Toit' }
    });

    if (!repeater) {
      console.log('❌ Repeater not found\n');
      await prisma.$disconnect();
      return;
    }

    console.log(`Repeater: ${repeater.label}`);
    console.log(`Templates: ${templateIds.length}\n`);

    // Get all templates with their linkedVariableIds
    if (templateIds.length === 0) {
      console.log('❌ No templates\n');
      await prisma.$disconnect();
      return;
    }

    // Parse templateNodeIds if it's a string
    let templateIds = repeater.repeater_templateNodeIds;
    if (typeof templateIds === 'string') {
      try {
        templateIds = JSON.parse(templateIds);
      } catch {
        templateIds = [];
      }
    }
    if (!Array.isArray(templateIds)) {
      templateIds = [];
    }

    const templates = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: templateIds } },
      select: {
        id: true,
        label: true,
        linkedVariableIds: true
      },
      orderBy: { label: 'asc' }
    });

    console.log('📋 TEMPLATES AND THEIR linkedVariableIds:\n');
    
    let totalLinked = 0;
    for (const template of templates) {
      const linkedCount = template.linkedVariableIds?.length || 0;
      totalLinked += linkedCount;
      console.log(`${template.label}:`);
      console.log(`  linkedVariableIds: ${JSON.stringify(template.linkedVariableIds)}`);
      
      // Check if variables exist
      if (template.linkedVariableIds && template.linkedVariableIds.length > 0) {
        for (const varId of template.linkedVariableIds) {
          const exists = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: varId },
            select: { id: true }
          });
          console.log(`    ${exists ? '✅' : '❌'} ${varId.substring(0, 8)}...${varId.substring(varId.length - 4)}`);
        }
      }
      console.log();
    }

    console.log(`Total linkedVariableIds across all templates: ${totalLinked}\n`);

    // Get all instances/copies
    const copies = await prisma.treeBranchLeafNode.findMany({
      where: {
        parentId: repeater.id,
        NOT: { id: { in: templateIds } }
      },
      select: { id: true, label: true }
    });

    console.log(`📦 COPIES OF REPEATER: ${copies.length}`);
    for (const copy of copies) {
      console.log(`  - ${copy.label}`);
    }

    console.log('\n✅ Diagnosis complete. Key findings:');
    console.log(`   Templates with linkedVariableIds: ${templates.filter(t => (t.linkedVariableIds?.length || 0) > 0).length}`);
    console.log(`   Total linked variables across templates: ${totalLinked}`);
    console.log(`   Repeater instances: ${copies.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

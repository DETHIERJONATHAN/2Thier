#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('\n🎯 QUICK VARIABLE DIAGNOSIS\n');

    // Find the repeater
    const repeater = await prisma.treeBranchLeafNode.findFirst({
      where: { label: 'Toit' }
    });

    if (!repeater) {
      console.log('❌ Repeater "Toit" not found\n');
      return;
    }

    console.log(`✅ Repeater found: ${repeater.label}`);
    
    // Parse templateNodeIds
    let templateIds = [];
    if (repeater.repeater_templateNodeIds) {
      if (typeof repeater.repeater_templateNodeIds === 'string') {
        try {
          templateIds = JSON.parse(repeater.repeater_templateNodeIds);
        } catch {
          templateIds = repeater.repeater_templateNodeIds.split(',').filter(Boolean);
        }
      } else if (Array.isArray(repeater.repeater_templateNodeIds)) {
        templateIds = repeater.repeater_templateNodeIds;
      }
    }

    console.log(`📊 Found ${templateIds.length} templates\n`);

    if (templateIds.length === 0) {
      console.log('❌ No templates found\n');
      return;
    }

    // Get templates
    const templates = await prisma.treeBranchLeafNode.findMany({
      where: { id: { in: templateIds } },
      select: {
        id: true,
        label: true,
        linkedVariableIds: true
      },
      orderBy: { label: 'asc' }
    });

    console.log('📋 TEMPLATES:\n');
    
    let totalLinked = 0;
    let missingVars = 0;
    
    for (const template of templates) {
      const linkedCount = template.linkedVariableIds?.length || 0;
      totalLinked += linkedCount;
      
      if (linkedCount > 0) {
        console.log(`${template.label}: ${linkedCount} linked variable(s)`);
        
        for (const varId of template.linkedVariableIds) {
          const exists = await prisma.treeBranchLeafNodeVariable.findUnique({
            where: { id: varId },
            select: { id: true, displayName: true }
          });
          
          if (exists) {
            console.log(`  ✅ ${exists.displayName}`);
          } else {
            console.log(`  ❌ MISSING: ${varId.substring(0, 12)}...`);
            missingVars++;
          }
        }
      }
    }

    console.log(`\n📌 SUMMARY:`);
    console.log(`   Templates with linkedVariableIds: ${templates.filter(t => (t.linkedVariableIds?.length || 0) > 0).length}`);
    console.log(`   Total linked variables: ${totalLinked}`);
    console.log(`   Missing variables: ${missingVars} ❌`);

    if (missingVars === 0) {
      console.log(`\n✅ All variables exist!`);
    } else {
      console.log(`\n⚠️ WARNING: ${missingVars} variable(s) are missing from the database!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

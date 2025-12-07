import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseOrientationInclinaison() {
  console.log('🔍 DIAGNOSTIC: Orientation et Inclinaison\n');

  try {
    const nodes = await prisma.treeBranchLeafNode.findMany({
      where: {
        label: { in: ['Orientation', 'Inclinaison'] }
      },
      select: {
        id: true,
        label: true,
        fieldType: true,
        hasData: true,
        hasFormula: true,
        hasCondition: true,
        data_activeId: true,
        data_displayFormat: true,
        data_instances: true,
        metadata: true,
        fieldConfig: true,
        TreeBranchLeafNodeVariable: {
          select: {
            id: true,
            exposedKey: true,
            displayName: true
          }
        }
      }
    });

    for (const node of nodes) {
      console.log(`\n📍 "${node.label}" (${node.id})`);
      console.log(`   fieldType: ${node.fieldType}`);
      console.log(`   hasData: ${node.hasData}`);
      console.log(`   hasFormula: ${node.hasFormula}`);
      console.log(`   hasCondition: ${node.hasCondition}`);
      
      if (node.hasData) {
        console.log(`   ❌ hasData = TRUE (PROBLÈME!)`);
        console.log(`      data_activeId: ${node.data_activeId}`);
        console.log(`      data_displayFormat: ${node.data_displayFormat}`);
        console.log(`      data_instances: ${JSON.stringify(node.data_instances)}`);
      }
      
      if (node.TreeBranchLeafNodeVariable && node.TreeBranchLeafNodeVariable.length > 0) {
        console.log(`   ❌ ${node.TreeBranchLeafNodeVariable.length} variable(s)`);
        node.TreeBranchLeafNodeVariable.forEach(v => {
          console.log(`      - ${v.displayName} (${v.exposedKey})`);
        });
      }
      
      if (node.metadata) {
        console.log(`   📋 Metadata: ${JSON.stringify(node.metadata).substring(0, 200)}...`);
      }
      
      if (node.fieldConfig) {
        console.log(`   ⚙️ FieldConfig: ${JSON.stringify(node.fieldConfig).substring(0, 200)}...`);
      }
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseOrientationInclinaison();
